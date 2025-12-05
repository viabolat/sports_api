import React, { useState, useEffect, useCallback } from 'react';
import {
    Download, Search, AlertCircle, Database, Loader2, Calendar,
    History, Zap, Info, HardDrive, Shield, Clock, Filter,
    ChevronDown, ChevronUp, Save, Trash2, RefreshCw, ExternalLink,
    CheckCircle, XCircle, Play, Pause, Battery, BatteryCharging
} from 'lucide-react';

const SportsDataExtractor = () => {
    // Core state
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('sports_api_key') || '');
    const [league, setLeague] = useState('nfl');
    const [endpoint, setEndpoint] = useState('teams');
    const [mode, setMode] = useState('quick');
    const [params, setParams] = useState({});
    const [singleDate, setSingleDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedSeasons, setSelectedSeasons] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
    const [error, setError] = useState('');

    // Advanced features state
    const [cacheEnabled, setCacheEnabled] = useState(true);
    const [cacheData, setCacheData] = useState({});
    const [cacheStats, setCacheStats] = useState({ hits: 0, sizeKB: 0, entries: 0 });
    const [showAdvancedParams, setShowAdvancedParams] = useState(false);
    const [queryHistory, setQueryHistory] = useState([]);
    const [dataFormat, setDataFormat] = useState('nested');
    const [requestQueue, setRequestQueue] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const [autoDownload, setAutoDownload] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [showInfoPanel, setShowInfoPanel] = useState(true);

    // API endpoints configuration
    const nflEndpoints = {
        teams: {
            path: '/teams',
            params: ['division', 'conference'],
            supportsDates: false,
            supportsSeasons: false,
            description: 'Get all NFL teams with optional division/conference filters',
            rateLimit: 'free'
        },
        players: {
            path: '/players',
            params: ['search', 'team_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: false,
            description: 'Search players with pagination support',
            rateLimit: 'free'
        },
        games: {
            path: '/games',
            params: ['team_ids', 'weeks', 'cursor', 'per_page'],
            supportsDates: true,
            supportsSeasons: true,
            description: 'Game data with date/season filtering',
            rateLimit: 'premium'
        },
        stats: {
            path: '/stats',
            params: ['player_ids', 'game_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: true,
            description: 'Player statistics by game or season',
            rateLimit: 'premium'
        },
        season_stats: {
            path: '/season_stats',
            params: ['player_ids', 'team_id', 'postseason', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: true,
            description: 'Season-long player statistics',
            rateLimit: 'premium'
        },
        standings: {
            path: '/standings',
            params: [],
            supportsDates: false,
            supportsSeasons: true,
            description: 'Team standings by season',
            rateLimit: 'free'
        },
        player_injuries: {
            path: '/player_injuries',
            params: ['team_ids', 'player_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: false,
            description: 'Current player injury reports',
            rateLimit: 'free'
        },
        active_players: {
            path: '/players/active',
            params: ['search', 'team_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: false,
            description: 'Currently active players',
            rateLimit: 'free'
        },
        team_stats: {
            path: '/team_stats',
            params: ['team_ids', 'game_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: true,
            description: 'Team statistics by game or season',
            rateLimit: 'premium'
        },
    };

    const ncaafEndpoints = {
        conferences: {
            path: '/conferences',
            params: [],
            supportsDates: false,
            supportsSeasons: false,
            description: 'List of NCAAF conferences',
            rateLimit: 'free'
        },
        teams: {
            path: '/teams',
            params: ['conference_id'],
            supportsDates: false,
            supportsSeasons: false,
            description: 'Teams by conference',
            rateLimit: 'free'
        },
        players: {
            path: '/players',
            params: ['search', 'team_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: false,
            description: 'Search NCAAF players',
            rateLimit: 'free'
        },
        active_players: {
            path: '/players/active',
            params: ['search', 'team_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: false,
            description: 'Currently active players',
            rateLimit: 'free'
        },
        games: {
            path: '/games',
            params: ['team_ids', 'weeks', 'cursor', 'per_page'],
            supportsDates: true,
            supportsSeasons: true,
            description: 'NCAAF game data',
            rateLimit: 'premium'
        },
        standings: {
            path: '/standings',
            params: ['conference_id'],
            supportsDates: false,
            supportsSeasons: true,
            description: 'Conference standings by season',
            rateLimit: 'free'
        },
        rankings: {
            path: '/rankings',
            params: ['week'],
            supportsDates: false,
            supportsSeasons: true,
            description: 'Weekly team rankings',
            rateLimit: 'premium'
        },
        plays: {
            path: '/plays',
            params: ['game_id'],
            supportsDates: false,
            supportsSeasons: false,
            description: 'Play-by-play data for specific games',
            rateLimit: 'premium'
        },
        player_stats: {
            path: '/player_stats',
            params: ['player_ids', 'team_ids', 'game_ids', 'cursor', 'per_page'],
            supportsDates: true,
            supportsSeasons: true,
            description: 'Player game statistics',
            rateLimit: 'premium'
        },
        team_stats: {
            path: '/team_stats',
            params: ['team_ids', 'game_ids', 'cursor', 'per_page'],
            supportsDates: true,
            supportsSeasons: true,
            description: 'Team game statistics',
            rateLimit: 'premium'
        },
        player_season_stats: {
            path: '/player_season_stats',
            params: ['player_ids', 'team_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: true,
            description: 'Player season statistics',
            rateLimit: 'premium'
        },
        team_season_stats: {
            path: '/team_season_stats',
            params: ['team_ids', 'cursor', 'per_page'],
            supportsDates: false,
            supportsSeasons: true,
            description: 'Team season statistics',
            rateLimit: 'premium'
        },
    };

    const currentEndpoints = league === 'nfl' ? nflEndpoints : ncaafEndpoints;
    const currentEndpoint = currentEndpoints[endpoint];

    // Initialize cache and load saved settings
    useEffect(() => {
        // Load cache
        try {
            const cached = localStorage.getItem('sportsDataCache');
            if (cached) {
                const parsed = JSON.parse(cached);
                setCacheData(parsed.data || {});
                setCacheStats(parsed.stats || { hits: 0, sizeKB: 0, entries: 0 });
            }
        } catch (e) {
            console.warn("Could not load cache from localStorage:", e);
        }

        // Load query history
        const savedHistory = localStorage.getItem('sportsQueryHistory');
        if (savedHistory) {
            setQueryHistory(JSON.parse(savedHistory).slice(0, 10)); // Keep last 10
        }

        // Auto-save API key
        if (apiKey) {
            localStorage.setItem('sports_api_key', apiKey);
        }
    }, []);

    // Update cache stats and save to localStorage
    useEffect(() => {
        if (cacheEnabled) {
            const entries = Object.keys(cacheData).length;
            const sizeKB = Math.round(JSON.stringify(cacheData).length / 1024);
            const updatedStats = { ...cacheStats, entries, sizeKB };

            setCacheStats(updatedStats);

            try {
                localStorage.setItem('sportsDataCache', JSON.stringify({
                    data: cacheData,
                    stats: updatedStats,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn("Could not save cache - storage might be full:", e);
            }
        }
    }, [cacheData, cacheEnabled]);

    // Update estimated time when selections change
    useEffect(() => {
        if (mode === 'historical' && selectedSeasons.length > 0) {
            const cacheEfficiency = cacheEnabled ? 0.3 : 0; // 70% faster with cache
            const baseTime = selectedSeasons.length * 12; // 12 seconds per season
            const estimated = Math.round(baseTime * (1 - cacheEfficiency));
            setEstimatedTime(estimated);
        } else {
            setEstimatedTime(0);
        }
    }, [selectedSeasons, cacheEnabled, mode]);

    // Generate season options
    const generateSeasonOptions = () => {
        const currentYear = 2024;
        const startYear = league === 'nfl' ? 2002 : 2004;
        const seasons = [];
        for (let year = currentYear; year >= startYear; year--) {
            seasons.push(year);
        }
        return seasons;
    };

    // Parameter handling
    const handleParamChange = (paramName, value) => {
        setParams(prev => ({
            ...prev,
            [paramName]: value
        }));
    };

    // Season selection helpers
    const toggleSeason = (season) => {
        setSelectedSeasons(prev =>
            prev.includes(season)
                ? prev.filter(s => s !== season)
                : [...prev, season]
        );
    };

    const selectAllSeasons = () => {
        setSelectedSeasons(generateSeasonOptions());
    };

    const clearSeasons = () => {
        setSelectedSeasons([]);
    };

    const selectRecentSeasons = (count) => {
        const seasons = generateSeasonOptions().slice(0, count);
        setSelectedSeasons(seasons);
    };

    // Build query string
    const buildQueryString = (season = null) => {
        const queryParams = [];

        if (season && currentEndpoint.supportsSeasons) {
            queryParams.push(`seasons[]=${season}`);
        }

        if (currentEndpoint.supportsDates) {
            if (singleDate) {
                queryParams.push(`dates[]=${singleDate}`);
            }
            if (startDate) {
                queryParams.push(`start_date=${startDate}`);
            }
            if (endDate) {
                queryParams.push(`end_date=${endDate}`);
            }
        }

        Object.entries(params).forEach(([key, value]) => {
            if (value && value.toString().trim() !== '') {
                if (key.includes('_ids') || key === 'dates' || key === 'seasons' || key === 'weeks') {
                    const values = value.split(',').map(v => v.trim()).filter(v => v);
                    values.forEach(v => queryParams.push(`${key}[]=${encodeURIComponent(v)}`));
                } else if (key === 'season') {
                    // Skip season param as we handle it separately
                } else {
                    queryParams.push(`${key}=${encodeURIComponent(value)}`);
                }
            }
        });

        return queryParams.length > 0 ? '?' + queryParams.join('&') : '';
    };

    // Smart fetch with caching
    const smartFetch = useCallback(async (url, forceRefresh = false) => {
        const cacheKey = `fetch_${url}`;

        // Check cache first
        if (cacheEnabled && cacheData[cacheKey] && !forceRefresh) {
            const cached = cacheData[cacheKey];
            // Cache valid for 24 hours
            if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
                setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
                return cached.data;
            }
        }

        // Fetch from API
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            }

            const result = await response.json();

            // Cache the result
            if (cacheEnabled) {
                setCacheData(prev => ({
                    ...prev,
                    [cacheKey]: {
                        data: result,
                        timestamp: Date.now(),
                        url
                    }
                }));
            }

            return result;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }, [apiKey, cacheEnabled, cacheData]);

    // Fetch single query
    const fetchSingleQuery = async () => {
        if (!apiKey.trim()) {
            setError('Please enter your API key');
            return;
        }

        setLoading(true);
        setError('');
        setData(null);
        setProgress({ current: 0, total: 0, stage: 'Preparing request...' });

        try {
            const baseUrl = `https://api.balldontlie.io/${league}/v1`;
            const path = currentEndpoint.path;
            const queryString = buildQueryString();
            const url = `${baseUrl}${path}${queryString}`;

            setProgress({ current: 1, total: 1, stage: 'Fetching data...' });
            const result = await smartFetch(url);

            const queryInfo = {
                mode: 'quick',
                url,
                endpoint,
                league,
                timestamp: Date.now(),
                resultsCount: Array.isArray(result.data) ? result.data.length : 1
            };

            setData({
                mode: 'quick',
                results: result,
                queryInfo
            });

            // Save to history
            addToQueryHistory(queryInfo);

        } catch (err) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
            setProgress({ current: 0, total: 0, stage: '' });
        }
    };

    // Fetch historical data with pause/resume support
    const fetchHistoricalData = async () => {
        if (!apiKey.trim()) {
            setError('Please enter your API key');
            return;
        }

        if (selectedSeasons.length === 0) {
            setError('Please select at least one season');
            return;
        }

        setLoading(true);
        setError('');
        setData(null);
        setIsPaused(false);
        setProgress({
            current: 0,
            total: selectedSeasons.length,
            stage: 'Starting historical data fetch...'
        });

        try {
            const baseUrl = `https://api.balldontlie.io/${league}/v1`;
            const path = currentEndpoint.path;
            const allData = [];
            const cachedSeasons = [];

            for (let i = 0; i < selectedSeasons.length; i++) {
                // Check for pause
                while (isPaused) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (!loading) return; // Canceled
                }

                const season = selectedSeasons[i];
                setProgress({
                    current: i + 1,
                    total: selectedSeasons.length,
                    stage: `Fetching season ${season}...`
                });

                const queryString = buildQueryString(season);
                const url = `${baseUrl}${path}${queryString}`;

                // Check cache first
                let result;
                const cacheKey = `fetch_${url}`;
                const isCacheHit = cacheEnabled && cacheData[cacheKey] &&
                    (Date.now() - cacheData[cacheKey].timestamp < 24 * 60 * 60 * 1000);

                if (isCacheHit) {
                    result = cacheData[cacheKey].data;
                    cachedSeasons.push(season);
                    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
                } else {
                    result = await smartFetch(url);
                    // Rate limiting - only wait for non-cached requests
                    if (i < selectedSeasons.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds
                    }
                }

                allData.push({
                    season: season,
                    data: result,
                    cached: isCacheHit,
                    timestamp: Date.now()
                });
            }

            const queryInfo = {
                mode: 'historical',
                endpoint,
                league,
                seasons: selectedSeasons,
                timestamp: Date.now(),
                cachedSeasons,
                resultsCount: getHistoricalResultsCount(allData)
            };

            setData({
                mode: 'historical',
                seasons: selectedSeasons,
                results: allData,
                queryInfo
            });

            addToQueryHistory(queryInfo);

            // Auto-download if enabled
            if (autoDownload) {
                downloadJSON();
            }

        } catch (err) {
            setError(err.message || 'Failed to fetch historical data');
        } finally {
            setLoading(false);
            setIsPaused(false);
            setProgress({ current: 0, total: 0, stage: '' });
        }
    };

    // Add query to history
    const addToQueryHistory = (queryInfo) => {
        const newHistory = [
            {
                ...queryInfo,
                id: Date.now()
            },
            ...queryHistory
        ].slice(0, 10); // Keep only last 10

        setQueryHistory(newHistory);
        localStorage.setItem('sportsQueryHistory', JSON.stringify(newHistory));
    };

    // Fetch data based on mode
    const fetchData = () => {
        if (mode === 'quick') {
            fetchSingleQuery();
        } else {
            fetchHistoricalData();
        }
    };

    // Download functions
    const downloadJSON = () => {
        if (!data) return;

        const exportData = {
            ...data,
            exportInfo: {
                exportedAt: new Date().toISOString(),
                tool: 'Sports Data Extractor',
                version: '2.0'
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${league}_${endpoint}_${mode}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadCSV = () => {
        if (!data) return;

        let items = [];
        if (data.mode === 'historical') {
            // Flatten historical data
            data.results.forEach(seasonData => {
                const seasonItems = Array.isArray(seasonData.data.data) ? seasonData.data.data : [seasonData.data.data];
                seasonItems.forEach(item => {
                    items.push({ season: seasonData.season, ...item });
                });
            });
        } else {
            items = Array.isArray(data.results.data) ? data.results.data : [data.results.data];
        }

        if (items.length === 0) return;

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

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${league}_${endpoint}_${mode}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Cache management
    const clearCache = () => {
        setCacheData({});
        setCacheStats({ hits: 0, sizeKB: 0, entries: 0 });
        localStorage.removeItem('sportsDataCache');
    };

    const clearSpecificCache = (pattern) => {
        const newCache = {};
        Object.keys(cacheData).forEach(key => {
            if (!key.includes(pattern)) {
                newCache[key] = cacheData[key];
            }
        });
        setCacheData(newCache);
    };

    // Helper functions
    const clearDates = () => {
        setSingleDate('');
        setStartDate('');
        setEndDate('');
    };

    const getResultsCount = () => {
        if (!data) return 0;
        if (data.mode === 'historical') {
            return getHistoricalResultsCount(data.results);
        }
        return Array.isArray(data.results.data) ? data.results.data.length : 1;
    };

    const getHistoricalResultsCount = (results) => {
        return results.reduce((total, seasonData) => {
            const items = Array.isArray(seasonData.data.data) ? seasonData.data.data : [seasonData.data.data];
            return total + items.length;
        }, 0);
    };

    // Load from history
    const loadFromHistory = (historyItem) => {
        if (historyItem.mode === 'historical') {
            setMode('historical');
            setLeague(historyItem.league);
            setEndpoint(historyItem.endpoint);
            setSelectedSeasons(historyItem.seasons);
        } else {
            setMode('quick');
            setLeague(historyItem.league);
            setEndpoint(historyItem.endpoint);
        }
    };

    // Format time
    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds} seconds`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    // Render component
    return (
        <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'} p-4 md:p-6`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className={`rounded-xl shadow-2xl overflow-hidden mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className={`p-6 ${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gradient-to-r from-blue-600 to-blue-800'} text-white`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Database className="w-8 h-8" />
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold">Sports Data Extractor</h1>
                                    <p className="text-blue-100 mt-1">NFL & NCAAF API • Historical & Real-Time • Smart Caching</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-400'} transition-colors`}
                                >
                                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                                </button>
                                <button
                                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <Info className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 space-y-6">
                        {/* API Key & Quick Actions */}
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    API Key *
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value);
                                            localStorage.setItem('sports_api_key', e.target.value);
                                        }}
                                        placeholder="Enter your BallDontLie API key"
                                        className={`flex-1 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border border-gray-300'}`}
                                    />
                                    <button
                                        onClick={() => window.open('https://app.balldontlie.io', '_blank')}
                                        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Get Key
                                    </button>
                                </div>
                                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Your API key is saved locally in your browser
                                </p>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-blue-50'} border ${darkMode ? 'border-gray-700' : 'border-blue-200'}`}>
                                    <div className="text-xs font-medium text-gray-500">Cache Hits</div>
                                    <div className="text-xl font-bold">{cacheStats.hits}</div>
                                </div>
                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-purple-50'} border ${darkMode ? 'border-gray-700' : 'border-purple-200'}`}>
                                    <div className="text-xs font-medium text-gray-500">Cached Data</div>
                                    <div className="text-xl font-bold">{cacheStats.sizeKB} KB</div>
                                </div>
                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-green-50'} border ${darkMode ? 'border-gray-700' : 'border-green-200'}`}>
                                    <div className="text-xs font-medium text-gray-500">History</div>
                                    <div className="text-xl font-bold">{queryHistory.length}</div>
                                </div>
                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-yellow-50'} border ${darkMode ? 'border-gray-700' : 'border-yellow-200'}`}>
                                    <div className="text-xs font-medium text-gray-500">Est. Time</div>
                                    <div className="text-xl font-bold">{estimatedTime > 0 ? formatTime(estimatedTime) : '--'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Mode Selection */}
                        <div className={`rounded-lg p-4 border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
                            <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                Query Mode
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    onClick={() => setMode('quick')}
                                    className={`p-4 rounded-lg border-2 transition-all ${mode === 'quick'
                                        ? 'border-blue-600 bg-blue-100 shadow-md'
                                        : darkMode ? 'border-gray-700 bg-gray-900 hover:border-blue-400' : 'border-gray-300 bg-white hover:border-blue-400'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Zap className={`w-6 h-6 ${mode === 'quick' ? 'text-blue-600' : darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                        <div className="text-left">
                                            <div className={`font-semibold ${mode === 'quick' ? 'text-blue-900' : darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                Quick Query
                                            </div>
                                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Single request, instant results</div>
                                        </div>
                                        {mode === 'quick' && <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />}
                                    </div>
                                </button>

                                <button
                                    onClick={() => setMode('historical')}
                                    className={`p-4 rounded-lg border-2 transition-all ${mode === 'historical'
                                        ? 'border-blue-600 bg-blue-100 shadow-md'
                                        : darkMode ? 'border-gray-700 bg-gray-900 hover:border-blue-400' : 'border-gray-300 bg-white hover:border-blue-400'}`}
                                    disabled={!currentEndpoint.supportsSeasons}
                                >
                                    <div className="flex items-center gap-3">
                                        <History className={`w-6 h-6 ${mode === 'historical' ? 'text-blue-600' : darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                        <div className="text-left">
                                            <div className={`font-semibold ${mode === 'historical' ? 'text-blue-900' : darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                Historical Bulk
                                            </div>
                                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {currentEndpoint.supportsSeasons ? 'Multiple seasons at once' : 'Not available for this endpoint'}
                                            </div>
                                        </div>
                                        {mode === 'historical' && <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />}
                                        {!currentEndpoint.supportsSeasons && <XCircle className="w-5 h-5 text-red-500 ml-auto" />}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Configuration Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* League & Endpoint */}
                            <div className="lg:col-span-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                            League
                                        </label>
                                        <select
                                            value={league}
                                            onChange={(e) => {
                                                setLeague(e.target.value);
                                                setEndpoint(e.target.value === 'nfl' ? 'teams' : 'conferences');
                                                setParams({});
                                                setData(null);
                                                clearDates();
                                                setSelectedSeasons([]);
                                            }}
                                            className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border border-gray-300'}`}
                                        >
                                            <option value="nfl">NFL</option>
                                            <option value="ncaaf">NCAAF</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                            Endpoint
                                        </label>
                                        <select
                                            value={endpoint}
                                            onChange={(e) => {
                                                setEndpoint(e.target.value);
                                                setParams({});
                                                setData(null);
                                                clearDates();
                                                setSelectedSeasons([]);
                                            }}
                                            className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border border-gray-300'}`}
                                        >
                                            {Object.keys(currentEndpoints).map(key => (
                                                <option key={key} value={key}>
                                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    {currentEndpoints[key].rateLimit === 'premium' ? ' (Premium)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Endpoint Description */}
                                <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <span className="font-semibold">{currentEndpoint.description}</span>
                                        <span className={`ml-2 px-2 py-1 rounded text-xs ${currentEndpoint.rateLimit === 'premium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {currentEndpoint.rateLimit === 'premium' ? 'PREMIUM ENDPOINT' : 'FREE TIER'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Cache & Settings */}
                            <div className="space-y-4">
                                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <HardDrive className="w-5 h-5 text-blue-600" />
                                            <span className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Smart Cache</span>
                                        </div>
                                        <label className="flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={cacheEnabled}
                                                    onChange={(e) => setCacheEnabled(e.target.checked)}
                                                />
                                                <div className={`block w-10 h-6 rounded-full transition-colors ${cacheEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${cacheEnabled ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={clearCache}
                                            className="flex-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear
                                        </button>
                                        <button
                                            onClick={() => clearSpecificCache(league)}
                                            className="flex-1 px-3 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                                        >
                                            Clear {league.toUpperCase()}
                                        </button>
                                    </div>
                                </div>

                                {/* Auto-download Toggle */}
                                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-purple-50 border-purple-200'}`}>
                                    <label className="flex items-center cursor-pointer justify-between">
                                        <div className="flex items-center gap-2">
                                            <Download className="w-4 h-4 text-purple-600" />
                                            <span className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Auto-download JSON</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="toggle"
                                            checked={autoDownload}
                                            onChange={(e) => setAutoDownload(e.target.checked)}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Historical Mode: Season Selection */}
                        {mode === 'historical' && currentEndpoint.supportsSeasons && (
                            <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-800 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <History className="w-5 h-5 text-purple-600" />
                                        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Select Seasons</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>
                                            {selectedSeasons.length} selected
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={selectAllSeasons}
                                            className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => selectRecentSeasons(5)}
                                            className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                                        >
                                            Last 5 Years
                                        </button>
                                        <button
                                            onClick={clearSeasons}
                                            className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
                                    {generateSeasonOptions().map(season => (
                                        <button
                                            key={season}
                                            onClick={() => toggleSeason(season)}
                                            className={`px-2 py-2 text-sm rounded transition-all ${selectedSeasons.includes(season)
                                                ? 'bg-purple-600 text-white shadow-md'
                                                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-purple-100 border border-gray-300'
                                                }`}
                                        >
                                            {season}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Estimated time: <span className="font-semibold">{formatTime(estimatedTime)}</span>
                                        {cacheEnabled && selectedSeasons.length > 0 && ' (caching active)'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {cacheEnabled && (
                                            <div className="flex items-center gap-1">
                                                <BatteryCharging className="w-4 h-4 text-green-500" />
                                                <span className="text-xs text-green-600">Cache Ready</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Date Filters */}
                        {mode === 'quick' && currentEndpoint.supportsDates && (
                            <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-800 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Date Filters</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Single Date
                                        </label>
                                        <input
                                            type="date"
                                            value={singleDate}
                                            onChange={(e) => setSingleDate(e.target.value)}
                                            className={`w-full px-3 py-2 text-sm rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border border-gray-300'}`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className={`w-full px-3 py-2 text-sm rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border border-gray-300'}`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className={`w-full px-3 py-2 text-sm rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border border-gray-300'}`}
                                        />
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Use single date OR date range (start + end dates)
                                    </p>
                                    {(singleDate || startDate || endDate) && (
                                        <button
                                            onClick={clearDates}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Clear Dates
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Parameters */}
                        {currentEndpoint.params.length > 0 && (
                            <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Query Parameters (Optional)
                                    </h3>
                                    <button
                                        onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                        {showAdvancedParams ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        {showAdvancedParams ? 'Hide' : 'Show'} Advanced
                                    </button>
                                </div>

                                {showAdvancedParams && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {currentEndpoint.params.map(param => (
                                                <div key={param}>
                                                    <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {param.replace(/_/g, ' ')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={params[param] || ''}
                                                        onChange={(e) => handleParamChange(param, e.target.value)}
                                                        placeholder={param.includes('_ids') || param === 'dates' || param === 'seasons' ? 'Comma-separated' : 'Value'}
                                                        className={`w-full px-3 py-2 text-sm rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border border-gray-300'}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            For array parameters (team_ids, dates, etc.), enter comma-separated values
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Query History (Collapsible) */}
                        {queryHistory.length > 0 && (
                            <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Recent Queries
                                    </h3>
                                    <span className="text-xs text-gray-500">Click to reload</span>
                                </div>
                                <div className="space-y-2">
                                    {queryHistory.slice(0, 5).map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => loadFromHistory(item)}
                                            className={`w-full p-3 rounded-lg text-left transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100 border border-gray-200'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{item.endpoint.replace(/_/g, ' ')}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.mode === 'historical'
                                                            ? `${item.seasons?.length} seasons`
                                                            : `${item.resultsCount} results`}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(item.timestamp).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={fetchData}
                                disabled={loading || !apiKey.trim() || (mode === 'historical' && selectedSeasons.length === 0 && currentEndpoint.supportsSeasons)}
                                className={`flex-1 py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors font-semibold ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {progress.total > 0 ? (
                                            <span>Fetching {progress.current}/{progress.total}...</span>
                                        ) : (
                                            <span>Fetching...</span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        {mode === 'quick' ? 'Fetch Data' : 'Fetch Historical Data'}
                                    </>
                                )}
                            </button>

                            {loading && mode === 'historical' && (
                                <button
                                    onClick={() => setIsPaused(!isPaused)}
                                    className={`px-6 py-3 rounded-lg flex items-center justify-center gap-2 ${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white font-semibold`}
                                >
                                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                                    {isPaused ? 'Resume' : 'Pause'}
                                </button>
                            )}
                        </div>

                        {/* Progress Bar for Historical Mode */}
                        {loading && progress.total > 0 && (
                            <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-800 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-blue-900'}`}>
                                        {progress.stage}
                                    </span>
                                    <span className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                        {Math.round((progress.current / progress.total) * 100)}%
                                    </span>
                                </div>
                                <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-blue-200'}`}>
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                                <div className="mt-2 flex justify-between">
                                    <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                        Season {progress.current} of {progress.total}
                                    </p>
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Caching: {cacheEnabled ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className={`rounded-lg p-4 flex items-start gap-3 ${darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'} border`}>
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className={`text-sm font-semibold ${darkMode ? 'text-red-300' : 'text-red-800'}`}>Error</h4>
                                    <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-700'} mt-1`}>{error}</p>
                                    {error.includes('401') && (
                                        <p className="text-xs text-red-600 mt-2">
                                            Your API key may be invalid or expired. Please check your key at{' '}
                                            <a href="https://app.balldontlie.io" target="_blank" rel="noopener noreferrer" className="underline">
                                                app.balldontlie.io
                                            </a>
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setError('')}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Data Display */}
                        {data && (
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Results ({getResultsCount()} item{getResultsCount() !== 1 ? 's' : ''})
                                            {data.mode === 'historical' && ` across ${data.seasons?.length} season${data.seasons?.length !== 1 ? 's' : ''}`}
                                        </h3>
                                        {data.queryInfo?.cachedSeasons?.length > 0 && (
                                            <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                {data.queryInfo.cachedSeasons.length} seasons loaded from cache
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={downloadJSON}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            JSON
                                        </button>
                                        <button
                                            onClick={downloadCSV}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            CSV
                                        </button>
                                        <button
                                            onClick={() => setData(null)}
                                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <div className={`rounded-lg p-4 overflow-auto max-h-96 ${darkMode ? 'bg-gray-800' : 'bg-gray-900'}`}>
                                    <pre className="text-sm text-green-400 font-mono">
                                        {JSON.stringify(data, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Panel */}
                {showInfoPanel && (
                    <div className={`mt-6 rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-3">
                                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Features & Tips</h2>
                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Maximize your API usage with these features
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowInfoPanel(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Quick Query Features */}
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-blue-50'} border ${darkMode ? 'border-gray-700' : 'border-blue-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="w-5 h-5 text-blue-600" />
                                    <h3 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Quick Query Mode</h3>
                                </div>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Instant results with caching</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date filtering support</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Query history tracking</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Historical Bulk Features */}
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-purple-50'} border ${darkMode ? 'border-gray-700' : 'border-purple-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <History className="w-5 h-5 text-purple-600" />
                                    <h3 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Historical Bulk Mode</h3>
                                </div>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Multi-season selection</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Smart caching system</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pause/Resume capability</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Smart Features */}
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-green-50'} border ${darkMode ? 'border-gray-700' : 'border-green-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="w-5 h-5 text-green-600" />
                                    <h3 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Smart Features</h3>
                                </div>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>24-hour cache validity</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Auto-download option</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rate limit protection</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Rate Limit Info */}
                        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-yellow-50'} border ${darkMode ? 'border-gray-700' : 'border-yellow-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-yellow-600" />
                                <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>API Rate Limits</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h5 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Free Tier</h5>
                                    <ul className={`text-xs space-y-1 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <li>• 5 requests per minute</li>
                                        <li>• Basic endpoints only</li>
                                        <li>• Limited historical data</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Premium Tier</h5>
                                    <ul className={`text-xs space-y-1 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <li>• 60 requests per minute</li>
                                        <li>• All endpoints available</li>
                                        <li>• Full historical access</li>
                                    </ul>
                                    <a
                                        href="https://app.balldontlie.io/pricing"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Upgrade to Premium →
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SportsDataExtractor;