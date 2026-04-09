export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
            <div className="w-[90%] max-w-md space-y-4 animate-pulse">
                <div className="h-24 rounded-3xl bg-white/40 shadow-inner"></div>
                <div className="h-32 rounded-3xl bg-white/40 shadow-inner"></div>
                <div className="h-20 rounded-3xl bg-white/40 shadow-inner"></div>
            </div>
        </div>
    );
}