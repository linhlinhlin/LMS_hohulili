E:\Sach\DuAn\Hinto_Stock> python -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
INFO:     Will watch for changes in these directories: ['E:\\Sach\\DuAn\\Hinto_Stock']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [6112] using StatReload
INFO:     Started server process [11152]
INFO:     Waiting for application startup.
INFO:src.api.main:🚀 Starting up Hinto Trader Pro API...
INFO:src.api.event_bus:EventBus initialized
INFO:src.api.websocket_manager:WebSocketManager initialized
WARNING:src.infrastructure.indicators.talib_calculator:TA-Lib not available, using pandas fallback
INFO:src.infrastructure.indicators.atr_calculator:ATRCalculator initialized with period=14
INFO:src.infrastructure.indicators.adx_calculator:ADXCalculator initialized with period=14
INFO:src.infrastructure.indicators.atr_calculator:ATRCalculator initialized with period=14
INFO:src.infrastructure.indicators.volume_spike_detector:VolumeSpikeDetector initialized with threshold=2.0x
INFO:src.application.services.tp_calculator:TPCalculator initialized: min_RR=1.5, tp3_ext=1.500%
INFO:src.application.services.stop_loss_calculator:StopLossCalculator initialized: max_risk=1.000%, min_distance=0.300%   
INFO:src.application.services.confidence_calculator:ConfidenceCalculator initialized
INFO:src.application.services.trading_state_machine:TradingStateMachine initialized in BOOTSTRAP
INFO:src.application.services.hard_filters:Using config MAX_BOOK_TICKER_AGE_SECONDS: 2.0s
INFO:src.application.services.hard_filters:HardFilters initialized: ADX>25.0, Spread<0.10%, StaleData>2.0s
INFO:src.application.services.hard_filters:✅ BookTickerClient injected for real spread data
INFO:src.infrastructure.persistence.sqlite_state_repository:SQLiteStateRepository initialized: data/trading_system.db     
INFO:src.infrastructure.di_container:Created PaperExchangeService (PAPER mode)
INFO:src.application.services.state_recovery_service:StateRecoveryService initialized with paper exchange
INFO:src.application.analysis.rsi_monitor:RSIMonitor initialized: period=6, thresholds=[20.0, 35.0, 65.0, 80.0]
INFO:src.application.services.entry_price_calculator:EntryPriceCalculator initialized: offset=0.100%, max_ema_distance=0.500%
INFO:src.application.services.tp_calculator:TPCalculator initialized: min_RR=1.5, tp3_ext=1.500%
INFO:src.application.services.stop_loss_calculator:StopLossCalculator initialized: max_risk=1.000%, min_distance=0.300%   
INFO:src.application.services.confidence_calculator:ConfidenceCalculator initialized
INFO:src.application.services.hard_filters:✅ BookTickerClient updated
INFO:src.infrastructure.di_container:Created RealtimeService for btcusdt with all dependencies
INFO:src.api.event_bus:EventBus captured event loop: <_WindowsSelectorEventLoop running=True closed=False debug=False>    
INFO:src.api.event_bus:🚀 Broadcast Worker Started (Thread-Safe Mode)
INFO:src.api.main:✅ EventBus broadcast worker started       
INFO:src.application.services.trading_state_machine:EventBus connected to TradingStateMachine
INFO:src.application.services.realtime_service:✅ EventBus connected to RealtimeService
INFO:src.api.main:✅ EventBus connected to RealtimeService   
INFO:src.api.main:✅ RealtimeService starting...
INFO:src.application.services.realtime_service:Starting real-time service for btcusdt
INFO:src.application.services.realtime_service:🔄 Running state recovery...
INFO:src.application.services.state_recovery_service:🔄 Starting state recovery for btcusdt...
INFO:src.application.services.state_recovery_service:No persisted state found, starting fresh
INFO:src.application.services.realtime_service:Recovery result: ℹ️ No recovery needed: No persisted state found in databasse
INFO:src.application.services.realtime_service:🔄 Starting warm-up phase (BOOTSTRAP)...
INFO:src.application.services.warmup_manager:🔄 Starting warm-up: btcusdt 15m x1000
INFO:src.infrastructure.api.binance_rest_client:Fetched 1000 klines for btcusdt 15m
INFO:src.application.services.warmup_manager:📊 Loaded 1000 historical candles
INFO:src.application.services.warmup_manager:✅ ✅ Warm-up complete: 1000 candles, VWAP=88800.07, ADX=45.1
INFO:src.application.services.realtime_service:✅ Warm-up complete: ✅ Warm-up complete: 1000 candles, VWAP=88800.07, ADX=45.1
INFO:src.application.services.trading_state_machine:🔄 State transition: BOOTSTRAP → SCANNING: Warm-up complete: 1000 candles
INFO:src.application.services.realtime_service:📊 Subscribing to BookTicker for real spread data...
INFO:src.infrastructure.websocket.binance_book_ticker_client:🔌 Starting bookTicker WebSocket...
INFO:src.infrastructure.websocket.binance_book_ticker_client:📊 Subscribed to bookTicker: btcusdt
INFO:src.application.services.realtime_service:✅ BookTicker subscribed for btcusdt
INFO:src.application.services.realtime_service:Loading historical data...
INFO:src.application.services.realtime_service:Fetching historical candles...
INFO:src.infrastructure.api.binance_rest_client:Fetched 100 klines for btcusdt 1m
INFO:src.application.services.realtime_service:Loaded 100 historical 1m candles
INFO:src.infrastructure.aggregation.data_aggregator:✅ 15m candle completed: 2025-12-22 13:53:00
INFO:src.infrastructure.aggregation.data_aggregator:✅ 15m candle completed: 2025-12-22 14:08:00
INFO:src.infrastructure.aggregation.data_aggregator:✅ 15m candle completed: 2025-12-22 14:23:00
INFO:src.infrastructure.aggregation.data_aggregator:✅ 15m candle completed: 2025-12-22 14:38:00
INFO:src.infrastructure.aggregation.data_aggregator:✅ 1h candle completed: 2025-12-22 13:53:00
INFO:src.infrastructure.aggregation.data_aggregator:✅ 15m candle completed: 2025-12-22 14:53:00
INFO:src.infrastructure.aggregation.data_aggregator:✅ 15m candle completed: 2025-12-22 15:08:00
INFO:src.infrastructure.api.binance_rest_client:Fetched 100 klines for btcusdt 15m
INFO:src.application.services.realtime_service:Loaded 99 historical 15m candles
INFO:src.infrastructure.api.binance_rest_client:Fetched 100 klines for btcusdt 1h
INFO:src.application.services.realtime_service:Loaded 99 historical 1h candles
INFO:src.application.services.realtime_service:✅ Historical data loaded successfully
INFO:src.infrastructure.websocket.binance_websocket_client:Connecting to Binance WebSocket: wss://stream.binance.com:9443/ws/btcusdt@kline_1m
INFO:     Application startup complete.
INFO:src.infrastructure.websocket.binance_book_ticker_client:🔌 Connecting to: wss://stream.binance.com:9443/ws/btcusdt@bookTicker
INFO:     127.0.0.1:37313 - "GET /trades/portfolio HTTP/1.1" 200 OK
INFO:src.infrastructure.websocket.binance_websocket_client:✅ WebSocket connected successfully
INFO:src.application.services.realtime_service:✅ Real-time service started successfully
INFO:src.infrastructure.websocket.binance_book_ticker_client:✅ BookTicker WebSocket connected
INFO:src.infrastructure.websocket.binance_websocket_client:📊 Candle: 89729.96 - notifying 1 callbacks
INFO:src.application.services.realtime_service:🕯️ _on_candle__received: 89729.96
INFO:src.application.services.realtime_service:📢 Calling _notify_update_callbacks with 0 callbacks
INFO:src.infrastructure.indicators.talib_calculator:Indicators calculated: EMA7(100/100), EMA25(100/100), RSI(95/100), VMA(81/100)
INFO:     127.0.0.1:37313 - "GET /trades/portfolio HTTP/1.1" 200 OK
INFO:     127.0.0.1:53472 - "WebSocket /ws/stream/btcusdt" [accepted]
INFO:src.api.websocket_manager:Client connected: btcusdt_0_1766392356.138109 for symbol btcusdt. Total connections: 1     
INFO:src.infrastructure.indicators.talib_calculator:Indicators calculated: EMA7(100/100), EMA25(100/100), RSI(95/100), VMA(81/100)
INFO:     connection open
INFO:src.api.routers.market:Client btcusdt_0_1766392356.138109 connected, initial snapshot sent
INFO:     127.0.0.1:37313 - "GET /system/status HTTP/1.1" 200 OK
INFO:src.infrastructure.websocket.binance_websocket_client:📊 Candle: 89727.41 - notifying 1 callbacks
INFO:src.application.services.realtime_service:🕯️ _on_candle__received: 89727.41
INFO:src.application.services.realtime_service:📢 Calling _notify_update_callbacks with 0 callbacks
INFO:src.infrastructure.indicators.talib_calculator:Indicators calculated: EMA7(100/100), EMA25(100/100), RSI(95/100), VMA(81/100)
INFO:     127.0.0.1:37313 - "GET /system/status HTTP/1.1" 200 OK
INFO:     127.0.0.1:37313 - "GET /trades/portfolio HTTP/1.1" 200 OK
INFO:src.infrastructure.websocket.binance_websocket_client:📊 Candle: 89759.99 - notifying 1 ca