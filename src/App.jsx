import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, Search, AlertCircle, Database, Loader2, Calendar, History, Zap, Info, CloudOff, Cloud, Clock, HardDrive, RotateCw } from 'lucide-react';

// --- Data Configuration (Enhanced with Tier Info) ---

const NFL_ENDPOINTS = {
  teams: { path: '/teams', params: ['division', 'conference'], supportsDates: false, supportsSeasons: false, tier: 'Free' },
  players: { path: '/players', params: ['search', 'team_ids', 'cursor', 'per_page'], supportsDates: false, supportsSeasons: false, tier: 'Free' },
  games: { path: '/games', params: ['team_ids', 'weeks', 'cursor', 'per_page'], supportsDates: true, supportsSeasons: true, tier: 'Free' },
  standings: { path: '/standings', params: [], supportsDates: false, supportsSeasons: true, tier: 'Free' },
  // Pro/Advanced Endpoints (example for tier differentiation)
  stats: { path: '/stats', params: ['player_ids', 'game_ids', 'cursor', 'per_page'], supportsDates: false, supportsSeasons: true, tier: 'Pro' },
  season_stats: { path: '/season_stats', params: ['player_ids', 'team_id', 'postseason', 'cursor', 'per_page'], supportsDates: false, supportsSeasons: true, tier: 'Pro' },
  player_injuries: { path: '/player_injuries', params: ['team_ids', 'player_ids', 'cursor', 'per_page'], supportsDates: false, supportsSeasons: false, tier: 'Pro' },
};

const NCAAF_ENDPOINTS = {
  conferences: { path: '/conferences', params: [], supportsDates: false, supportsSeasons: false, tier: 'Free' },
  teams: { path: '/teams', params: ['conference_id'], supportsDates: false, supportsSeasons: false, tier: 'Free' },
  games: { path: '/games', params: ['team_ids', 'weeks', 'cursor', 'per_page'], supportsDates: true, supportsSeasons: true, tier: 'Free' },
  rankings: { path: '/rankings', params: ['week'], supportsDates: false, supportsSeasons: true, tier: 'Free' },
  // Pro/Advanced Endpoints
  player_stats: { path: '/player_stats', params: ['player_ids', 'team_ids', 'game_ids', 'cursor', 'per_page'], supportsDates: true, supportsSeasons: true, tier: 'Pro' },
  team_stats: { path: '/team_stats', params: ['team_ids', 'game_ids', 'cursor', 'per_page'], supportsDates: true, supportsSeasons: true, tier: 'Pro' },
};

// --- Component Definition ---

const SportsDataExtractor = () => {
  const [apiKey, setApiKey] = useState('');
  const [league, setLeague] = useState('nfl');
  const [endpoint, setEndpoint] = useState('teams');
  const [mode, setMode] = useState('quick'); // 'quick' or 'historical'
  const [params, setParams] = useState({});
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSeasons, setSelectedSeasons] = useState([]);
  const [data, setData] = useState(null); // Stores fetched data structure
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  // Caching States
  const [useLocalCache, setUseLocalCache] = useState(true);
  const [forceRefreshCache, setForceRefreshCache] = useState(false);
  const [cacheStatus, setCacheStatus] = useState({ count: 0, sizeKB: 0 });
  const [cacheHits, setCacheHits] = useState(0);

  const currentEndpoints = league === 'nfl' ? NFL_ENDPOINTS : NCAAF_ENDPOINTS;
  const currentEndpoint = currentEndpoints[endpoint] || {};

  // --- Utility Functions ---

  // Generate season options (NFL: 2002-2024, NCAAF: 2004-2024)
  const generateSeasonOptions = () => {
    const currentYear = 2024;
    const startYear = league === 'nfl' ? 2002 : 2004;
    const seasons = [];
    for (let year = currentYear; year >= startYear; year--) {
      seasons.push(year);
    }
    return seasons;
  };

  const cacheKeyPrefix = useMemo(() => `sde_cache_${league}_${endpoint}`, [league, endpoint]);

  const updateCacheStatus = useCallback(() => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('sde_cache_'));
    let totalSize = 0;
    keys.forEach(key => {
      totalSize += (localStorage.getItem(key) || '').length * 2; // Approximate bytes
    });
    setCacheStatus({
      count: keys.length,
      sizeKB: Math.round(totalSize / 1024)
    });
  }, []);

  // Clear all app-related cache keys
  const clearAllCache = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sde_cache_')) {
        localStorage.removeItem(key);
      }
    });
    setCacheHits(0);
    updateCacheStatus();
  };

  // --- Effects (Initialization & Persistence) ---

  useEffect(() => {
    // Load API key and initial cache status on mount
    const savedKey = localStorage.getItem('sde_api_key');
    if (savedKey) setApiKey(savedKey);
    updateCacheStatus();
  }, [updateCacheStatus]);

  useEffect(() => {
    // Persist API key
    if (apiKey) localStorage.setItem('sde_api_key', apiKey);
  }, [apiKey]);

  // Reset data/selections when league/endpoint changes
  const handleEndpointChange = (newEndpoint) => {
    setEndpoint(newEndpoint);
    setParams({});
    setData(null);
    clearDates();
    setSelectedSeasons([]);
    setForceRefreshCache(false);
  };

  // --- State Handlers ---

  const handleParamChange = (paramName, value) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
  };

  const toggleSeason = (season) => {
    setSelectedSeasons(prev =>
      prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season]
    );
  };

  const selectAllSeasons = () => setSelectedSeasons(generateSeasonOptions());
  const clearSeasons = () => setSelectedSeasons([]);
  const clearDates = () => { setSingleDate(''); setStartDate(''); setEndDate(''); };

  // --- Query Building & Execution ---

  const buildQueryString = (season = null) => {
    const queryParams = [];
    if (season && currentEndpoint.supportsSeasons) { queryParams.push(`seasons[]=${season}`); }
    if (currentEndpoint.supportsDates) {
      // If single date is set, ignore range
      if (singleDate) { queryParams.push(`dates[]=${singleDate}`); }
      // Only use range if single date is clear
      else if (startDate && endDate) {
        queryParams.push(`start_date=${startDate}`);
        queryParams.push(`end_date=${endDate}`);
      }
    }

    // Add custom params
    Object.entries(params).forEach(([key, value]) => {
      if (value && value.toString().trim() !== '') {
        // Handle array parameters (comma-separated inputs)
        if (key.includes('_ids') || key === 'dates' || key === 'seasons' || key === 'weeks') {
          const values = value.split(',').map(v => v.trim()).filter(v => v);
          values.forEach(v => queryParams.push(`${key}[]=${encodeURIComponent(v)}`));
        } else if (key !== 'season') { // Skip season param if it's handled by historical loop
          queryParams.push(`${key}=${encodeURIComponent(value)}`);
        }
      }
    });
    return queryParams.length > 0 ? '?' + queryParams.join('&') : '';
  };

  // Centralized fetching logic supporting caching
  const executeFetch = async (url, cacheKey) => {
    let isCacheHit = false;

    // 1. Check Cache
    if (useLocalCache && !forceRefreshCache && cacheKey) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        isCacheHit = true;
        setCacheHits(prev => prev + 1);
        try {
          return { data: JSON.parse(cached), fromCache: true };
        } catch (e) {
          console.error("Error parsing cached data. Refetching.", e);
          isCacheHit = false;
        }
      }
    }

    // 2. Perform API Request
    const response = await fetch(url, {
      headers: { 'Authorization': apiKey }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // 3. Save to Cache
    if (useLocalCache && cacheKey) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
        updateCacheStatus();
      } catch (e) {
        console.error("Cache save failed:", e);
      }
    }
    return { data: result, fromCache: false };
  };

  const fetchSingleQuery = async () => {
    if (!apiKey.trim()) { setError('Please enter your API key'); return; }

    setLoading(true); setError(''); setData(null);
    const baseUrl = `https://api.balldontlie.io/${league}/v1`;
    const path = currentEndpoint.path;
    const queryString = buildQueryString();
    const url = `${baseUrl}${path}${queryString}`;

    try {
      const { data: result, fromCache } = await executeFetch(url, `${cacheKeyPrefix}_quick_${queryString}`);
      setData({ mode: 'quick', data: result, fromCache });
    } catch (err) {
      setError(err.message || 'Failed to fetch quick data');
    } finally {
      setLoading(false);
      setForceRefreshCache(false);
    }
  };

  const fetchHistoricalData = async () => {
    if (!apiKey.trim()) { setError('Please enter your API key'); return; }
    if (!currentEndpoint.supportsSeasons) { setError(`Endpoint ${endpoint} does not support season-based historical fetching.`); return; }
    if (selectedSeasons.length === 0) { setError('Please select at least one season'); return; }

    setLoading(true); setError(''); setData(null);
    setProgress({ current: 0, total: selectedSeasons.length });

    const baseUrl = `https://api.balldontlie.io/${league}/v1`;
    const path = currentEndpoint.path;
    const allData = [];

    try {
      for (let i = 0; i < selectedSeasons.length; i++) {
        const season = selectedSeasons[i];
        setProgress({ current: i + 1, total: selectedSeasons.length });
        const queryString = buildQueryString(season);
        const url = `${baseUrl}${path}${queryString}`;
        const cacheKey = `${cacheKeyPrefix}_season_${season}_${queryString}`;

        const { data: result, fromCache } = await executeFetch(url, cacheKey);

        allData.push({ season, data: result, fromCache });

        // Rate limiting: 12 seconds only if the request was a fresh API call and it's not the last season
        if (!fromCache && i < selectedSeasons.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
      }

      setData({ mode: 'historical', seasons: selectedSeasons, results: allData });
    } catch (err) {
      setError(err.message || 'Failed to fetch historical data');
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
      setForceRefreshCache(false);
    }
  };

  const fetchData = () => {
    if (mode === 'quick') { fetchSingleQuery(); } else { fetchHistoricalData(); }
  };

  // --- Download Functions ---

  // Flattens nested data for CSV creation
  const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${league}_${endpoint}_${mode}_combined.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!data) return;
    let items = [];

    if (data.mode === 'historical') {
      data.results.forEach(seasonData => {
        const apiData = seasonData.data.data || seasonData.data; // Handles nested "data" key from API
        const seasonItems = Array.isArray(apiData) ? apiData : (apiData ? [apiData] : []);
        seasonItems.forEach(item => {
          items.push({ season: seasonData.season, ...item });
        });
      });
    } else {
      const apiData = data.data.data || data.data; // Handles nested "data" key
      items = Array.isArray(apiData) ? apiData : (apiData ? [apiData] : []);
    }

    if (items.length === 0) return;

    const flattened = items.map(item => flattenObject(item));
    const headers = [...new Set(flattened.flatMap(Object.keys))];

    const csvContent = [
      headers.join(','),
      ...flattened.map(row =>
        headers.map(h => {
          const val = row[h];
          return val !== undefined && val !== null ? `"${String(val).replace(/"/g, '""')}"` : '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${league}_${endpoint}_${mode}_combined.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk-download: trigger per-season JSON files (separate downloads)
  const bulkDownloadPerSeason = () => {
    if (!data || data.mode !== 'historical') return;
    data.results.forEach((seasonData, index) => {
      const blob = new Blob([JSON.stringify(seasonData.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${league}_${endpoint}_season_${seasonData.season}.json`;
      // Schedule clicks slightly apart (e.g., 250ms) to bypass most browser pop-up blockers
      setTimeout(() => {
        a.click();
        URL.revokeObjectURL(url);
      }, 250 * index);
    });
  };

  const getResultsCount = () => {
    if (!data) return 0;
    if (data.mode === 'historical') {
      return data.results.reduce((total, seasonData) => {
        const apiData = seasonData.data.data || seasonData.data;
        return total + (Array.isArray(apiData) ? apiData.length : (apiData ? 1 : 0));
      }, 0);
    }
    const apiData = data.data.data || data.data;
    return Array.isArray(apiData) ? apiData.length : (apiData ? 1 : 0);
  };

  // --- Component Render ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 font-[Inter]">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Sports Data Extractor</h1>
                <p className="text-blue-100 mt-1">NFL & NCAAF API Data Extraction Tool - Historical & Real-Time</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* API Key Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">API Key *</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your BallDontLie API key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your API key at <a href="https://app.balldontlie.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">app.balldontlie.io</a> (Key is saved locally for convenience)
              </p>
            </div>

            {/* Mode Selection */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Query Mode</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Quick Query Button */}
                <button
                  onClick={() => setMode('quick')}
                  className={`p-4 rounded-lg border-2 transition-all ${mode === 'quick' ? 'border-blue-600 bg-blue-100 shadow-md' : 'border-gray-300 bg-white hover:border-blue-400'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Zap className={`w-6 h-6 ${mode === 'quick' ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div className="text-left">
                      <div className={`font-semibold ${mode === 'quick' ? 'text-blue-900' : 'text-gray-700'}`}>Quick Query</div>
                      <div className="text-xs text-gray-600">Single request, instant results</div>
                    </div>
                  </div>
                </button>

                {/* Historical Bulk Button */}
                <button
                  onClick={() => setMode('historical')}
                  disabled={!currentEndpoint.supportsSeasons}
                  className={`p-4 rounded-lg border-2 transition-all ${mode === 'historical' ? 'border-blue-600 bg-blue-100 shadow-md' : 'border-gray-300 bg-white hover:border-blue-400 disabled:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <History className={`w-6 h-6 ${mode === 'historical' ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div className="text-left">
                      <div className={`font-semibold ${mode === 'historical' ? 'text-blue-900' : 'text-gray-700'}`}>Historical Bulk</div>
                      <div className="text-xs text-gray-600">Multiple seasons at once (Rate Limited)</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* League & Endpoint Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">League</label>
                <select
                  value={league}
                  onChange={(e) => {
                    setLeague(e.target.value);
                    handleEndpointChange(e.target.value === 'nfl' ? 'teams' : 'conferences');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="nfl">NFL</option>
                  <option value="ncaaf">NCAAF</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Endpoint</label>
                <select
                  value={endpoint}
                  onChange={(e) => handleEndpointChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.keys(currentEndpoints).map(key => (
                    <option key={key} value={key}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ({currentEndpoints[key].tier})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Local Caching Toggle & Status */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={useLocalCache}
                      onChange={(e) => setUseLocalCache(e.target.checked)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${useLocalCache ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${useLocalCache ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-gray-700">
                    Local Cache: {useLocalCache ? 'Enabled' : 'Disabled'}
                  </div>
                </label>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-4 h-4" /> Cached: <span className="font-semibold text-gray-800">{cacheStatus.count}</span> items
                </span>
                <span className="flex items-center gap-1">
                  <Cloud className="w-4 h-4" /> Size: <span className="font-semibold text-gray-800">{cacheStatus.sizeKB}</span> KB
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4" /> Hits: <span className="font-semibold text-gray-800">{cacheHits}</span>
                </span>
                <button
                  onClick={clearAllCache}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded-lg transition-colors"
                >
                  Clear All Cache
                </button>
              </div>
            </div>

            {/* Historical Mode: Season Selection */}
            {mode === 'historical' && currentEndpoint.supportsSeasons && (
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Select Seasons ({selectedSeasons.length} selected)</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={selectAllSeasons} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Select All</button>
                    <button onClick={clearSeasons} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Clear</button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 h-48 overflow-y-auto pr-2">
                  {generateSeasonOptions().map(season => (
                    <button
                      key={season}
                      onClick={() => toggleSeason(season)}
                      className={`px-3 py-2 text-sm rounded transition-all ${selectedSeasons.includes(season) ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-purple-100 border border-gray-300'
                        }`}
                    >
                      {season}
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between items-center">
                  <p className="text-xs text-gray-600">
                    {selectedSeasons.length} season{selectedSeasons.length !== 1 ? 's' : ''} selected
                    {selectedSeasons.length > 0 && ' • '}
                    {selectedSeasons.length > 0 && `Estimated API time: ~${selectedSeasons.length * 12} seconds (if all must be fetched)`}
                  </p>
                  <button
                    onClick={() => setForceRefreshCache(true)}
                    disabled={!useLocalCache || loading}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 font-medium flex items-center gap-1"
                  >
                    <RotateCw className={`w-3 h-3 ${forceRefreshCache ? 'animate-spin' : ''}`} />
                    {forceRefreshCache ? 'Force Refresh ON' : 'Force Refresh (Bypass Cache)'}
                  </button>
                </div>
              </div>
            )}

            {/* Date Filters (only for Quick Query mode) */}
            {mode === 'quick' && currentEndpoint.supportsDates && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-700">Date Filters (Applies to Quick Query only)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Single Date</label>
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(e) => { setSingleDate(e.target.value); setStartDate(''); setEndDate(''); }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setSingleDate(''); }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setSingleDate(''); }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-600">Use single date OR date range (start + end dates)</p>
                  {(singleDate || startDate || endDate) && (
                    <button onClick={clearDates} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Clear Dates</button>
                  )}
                </div>
              </div>
            )}

            {/* Parameters */}
            {currentEndpoint.params && currentEndpoint.params.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Query Parameters (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentEndpoint.params.map(param => (
                    <div key={param}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{param.replace(/_/g, ' ')}</label>
                      <input
                        type="text"
                        value={params[param] || ''}
                        onChange={(e) => handleParamChange(param, e.target.value)}
                        placeholder={param.includes('_ids') || param === 'dates' || param === 'seasons' ? 'Comma-separated' : 'Value'}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">For array parameters (team_ids, dates, etc.), enter comma-separated values</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={fetchData}
                disabled={loading || !apiKey.trim() || (mode === 'historical' && currentEndpoint.supportsSeasons && selectedSeasons.length === 0)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {progress.total > 0 ? `Processing ${progress.current}/${progress.total}...` : 'Fetching...'}
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    {mode === 'quick' ? 'Fetch Data' : 'Start Historical Fetch'}
                  </>
                )}
              </button>
            </div>

            {/* Progress Bar for Historical Mode */}
            {loading && progress.total > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    Processing Season {progress.current} of {progress.total}
                  </span>
                  <span className="text-sm text-blue-700">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Please wait... respecting API rate limits (12s delay between uncached requests)
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">API Error</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Data Display & Download Buttons */}
            {data && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">
                    Results ({getResultsCount()} item{getResultsCount() !== 1 ? 's' : ''})
                    {data.mode === 'historical' && ` across ${data.seasons.length} season${data.seasons.length !== 1 ? 's' : ''}`}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={downloadJSON} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm">
                      <Download className="w-4 h-4" />JSON (Combined)
                    </button>
                    <button onClick={downloadCSV} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm">
                      <Download className="w-4 h-4" />CSV (Flattened)
                    </button>
                    {data.mode === 'historical' && (
                      <button onClick={bulkDownloadPerSeason} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm">
                        <Download className="w-4 h-4" />JSON (Per-Season)
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-green-400 font-mono">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info & Tips Panel */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start gap-3 mb-4 border-b pb-4">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-gray-800">API Capabilities and Best Practices</h2>
              <p className="text-sm text-gray-600">Information about the selected endpoint, rate limits, and download tips.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Endpoint Info */}
            <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
              <h3 className="font-semibold text-indigo-800 mb-2">Current Endpoint: {endpoint.toUpperCase()}</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Required Tier: <span className="font-bold text-indigo-700">{currentEndpoint.tier || 'N/A'}</span>
                </li>
                <li className="flex items-center gap-2">
                  {currentEndpoint.supportsDates ? <Calendar className="w-4 h-4 text-green-600" /> : <Calendar className="w-4 h-4 text-red-600" />}
                  Date Filtering: <span className="font-semibold">{currentEndpoint.supportsDates ? 'Supported' : 'Not Supported'}</span>
                </li>
                <li className="flex items-center gap-2">
                  {currentEndpoint.supportsSeasons ? <History className="w-4 h-4 text-green-600" /> : <History className="w-4 h-4 text-red-600" />}
                  Season Filtering: <span className="font-semibold">{currentEndpoint.supportsSeasons ? 'Supported' : 'Not Supported'}</span>
                </li>
              </ul>
            </div>

            {/* Rate Limit Info */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="font-semibold text-red-800 mb-2">API Rate Limits (Free Tier)</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold">Maximum 5 requests per minute (RPM).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-600">Historical mode enforces a 12-second delay between new requests to prevent HTTP 429 errors.</span>
                </li>
              </ul>
            </div>

            {/* Download & Cache Tips */}
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Tips & Best Practices</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <Cloud className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-600">Caching speeds up repeated seasonal fetches significantly. Disable it only if you suspect data staleness.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Download className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-600">Use the CSV download for easy data manipulation, and JSON (Per-Season) for very large bulk exports.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportsDataExtractor;