import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '5m';
    let limit = parseInt(searchParams.get('limit') || '288');

    // 1. Map Symbol (Binance "BTCUSDT" -> CryptoCompare fsym="BTC", tsym="USD")
    const fsym = symbol.toUpperCase().replace('USDT', '').replace('BUSD', '');
    const tsym = 'USD';

    // 2. Map Interval to CryptoCompare Endpoint & Aggregate
    // CryptoCompare has: histominute, histohour, histoday
    // calculate aggregate: e.g. 5m -> histominute with aggregate=5
    let endpoint = 'histominute';
    let aggregate = 1;

    switch (interval) {
        case '1s': // Not supported, fallback to 1m
        case '1m':
            endpoint = 'histominute';
            aggregate = 1;
            break;
        case '5m':
            endpoint = 'histominute';
            aggregate = 5;
            break;
        case '15m':
            endpoint = 'histominute';
            aggregate = 15;
            break;
        case '1h':
            endpoint = 'histohour';
            aggregate = 1;
            break;
        case '4h':
            endpoint = 'histohour';
            aggregate = 4;
            break;
        case '1d':
            endpoint = 'histoday';
            aggregate = 1;
            break;
        default:
            endpoint = 'histominute';
            aggregate = 5; // Default to 5m
    }

    try {
        // Fetch from CryptoCompare (Free API, usually permissive)
        const url = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${fsym}&tsym=${tsym}&limit=${limit}&aggregate=${aggregate}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`CryptoCompare API error: ${res.statusText}`);
        }

        const json = await res.json();

        if (json.Response === 'Error') {
            throw new Error(json.Message);
        }

        // 3. Transform to Binance Format: [ time(ms), open, high, low, close, volume ]
        // CryptoCompare returns data in 'Data.Data' array
        // Each item: { time(s), open, high, low, close, volumefrom, ... }
        // We need: [time(ms), open, high, low, close, volume] strings

        const candidates = json.Data.Data;
        const binanceFormatData = candidates.map((c: any) => [
            c.time * 1000,
            c.open.toString(),
            c.high.toString(),
            c.low.toString(),
            c.close.toString(),
            c.volumefrom.toString()
        ]);

        // Binance API usually returns oldest first. CryptoCompare also does oldest first.
        // So no reverse needed if logic holds. (Verified: TimeFrom -> TimeTo order)

        return NextResponse.json(binanceFormatData);

    } catch (error: any) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
