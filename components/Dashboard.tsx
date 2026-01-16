"use client";

import { useState } from 'react';
import { PriceTicker } from "./PriceTicker";
import { CandleChart } from "./CandleChart";
import { TopCoins } from "./TopCoins";
import { Activity, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Dashboard() {
    const [timeframe, setTimeframe] = useState<'5m' | '1h' | '24h'>('24h');
    const [activeSymbol, setActiveSymbol] = useState<string>('BTCUSDT'); // Default

    const timelineConfig: Record<string, { interval: string; limit: number; label: string }> = {
        '5m': { interval: '1s', limit: 300, label: '5 Minute' },
        '1h': { interval: '1m', limit: 60, label: '1 Hour' },
        '24h': { interval: '5m', limit: 288, label: '24 Hour' },
    };

    const config = timelineConfig[timeframe];

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-white/5 bg-background/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Activity className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h1 className="text-xl font-bold font-mono tracking-tighter">
                        CRYPTO<span className="text-indigo-500">DECK</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Bell className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Settings className="w-5 h-5" />
                    </Button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 ring-2 ring-white/10" />
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 p-6 grid grid-cols-12 gap-6">

                {/* Left Col: Ticker & Top 10 List */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 max-h-[calc(100vh-100px)] sticky top-24">
                    <PriceTicker symbol={activeSymbol} />

                    <div className="flex-1 bg-secondary/20 border border-white/5 rounded-3xl p-6 backdrop-blur-sm overflow-hidden flex flex-col min-h-[400px]">
                        <TopCoins onSelectSymbol={setActiveSymbol} activeSymbol={activeSymbol} />
                    </div>
                </div>

                {/* Middle Col: Chart */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
                    <div className="flex-1 bg-secondary/20 border border-white/5 rounded-3xl p-6 backdrop-blur-sm min-h-[500px] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

                        <div className="flex items-center justify-between mb-4 z-10 relative">
                            <h3 className="text-muted-foreground font-medium">{activeSymbol.replace('USDT', '')}/USDT {config.label} Chart</h3>
                            <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                                {(['5m', '1h', '24h'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeframe(t)}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${timeframe === t
                                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-center h-full w-full">
                            <CandleChart symbol={activeSymbol} interval={config.interval} limit={config.limit} />
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
