"use client";

import { ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCryptoSocket } from '@/hooks/useCryptoSocket';

interface PriceTickerProps {
    symbol: string;
}

export function PriceTicker({ symbol }: PriceTickerProps) {
    const { ticker, isConnected } = useCryptoSocket(symbol.toLowerCase());

    // Calculate price change direction
    // const price = parseFloat(ticker?.price || '0');
    // const prevPrice = parseFloat(ticker?.prevPrice || '0');
    const isUp = ticker ? parseFloat(ticker.price) > parseFloat(ticker.prevPrice) : true;

    return (
        <div className="flex flex-col gap-4">
            {/* Dynamic Status Pill */}
            <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium w-fit transition-colors",
                isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
                <Activity className="w-3 h-3" />
                {isConnected ? "LIVE FEED" : "CONNECTING..."}
            </div>

            {/* Main Price Display */}
            <div className="relative overflow-hidden p-6 rounded-3xl bg-secondary/30 border border-white/5 backdrop-blur-xl">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-muted-foreground font-medium">{symbol.replace('USDT', '')}/USDT</h3>
                        {/* Percentage Change */}
                        <div className={cn(
                            "flex items-center px-2 py-0.5 rounded-md text-xs font-bold",
                            isUp ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#EF4444]/10 text-[#EF4444]"
                        )}>
                            {isUp ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                            2.45%
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                        <span className={cn(
                            "text-4xl sm:text-5xl font-mono font-bold tracking-tighter transition-colors duration-300",
                            isUp ? "text-[#10B981]" : "text-[#EF4444]"
                        )}>
                            ${parseFloat(ticker?.price || '0').toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
