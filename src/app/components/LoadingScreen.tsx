export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          cloudboard
        </h2>
      </div>
    </div>
  );
};
