"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

type Props = {
	onSearch: (query: string) => void;
	placeholder?: string;
	debounceMs?: number;
};

export default function SearchBar({ onSearch, placeholder = "Search: 185.14.22.91, alex.m, evt-2026...", debounceMs = 300 }: Props) {
	const [query, setQuery] = useState("");
	const [isActive, setIsActive] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			onSearch(query);
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [query, onSearch, debounceMs]);

	const handleClear = () => {
		setQuery("");
	};

	return (
		<div className="relative w-full">
			<div className={`flex items-center gap-3 rounded-sm border transition-all ${
				isActive
					? "border-blue-700/80 bg-slate-900/60 shadow-lg shadow-blue-900/20"
					: "border-slate-700 bg-slate-800/40"
			} px-4 py-3`}>
				<svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => setIsActive(true)}
					onBlur={() => setIsActive(false)}
					placeholder={placeholder}
					className="w-full flex-1 bg-transparent text-sm leading-relaxed text-slate-100 placeholder-slate-500 outline-none"
				/>
				{query && (
					<button
						onClick={handleClear}
						className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
						aria-label="Clear search"
					>
						<X size={14} />
					</button>
				)}
			</div>

			{/* Search guide */}
			{isActive && !query && (
				<div className="absolute top-full left-0 right-0 mt-2 rounded-sm border border-slate-700/50 bg-slate-900/90 p-3 text-xs leading-relaxed text-slate-400 shadow-lg">
					<p className="font-semibold text-slate-300 mb-2">Quick search by:</p>
					<ul className="space-y-1 ml-2">
						<li>• Event ID: <span className="text-sky-300 font-mono">evt-2026-04-001</span></li>
						<li>• User: <span className="text-sky-300 font-mono">alex.m</span></li>
						<li>• IP Address: <span className="text-sky-300 font-mono">185.14.22.91</span></li>
						<li>• Alert Title: <span className="text-sky-300 font-mono">unauthorized access</span></li>
					</ul>
				</div>
			)}
		</div>
	);
}
