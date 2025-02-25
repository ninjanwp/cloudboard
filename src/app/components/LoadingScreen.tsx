export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-[var(--background)] flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto"
          style={{
            borderColor: 'var(--accent)',
            borderTopColor: 'var(--surface)',
          }}
        />
        <h2 className="text-xl font-bold text-[var(--accent)]">
          cloudboard
        </h2>
      </div>
    </div>
  );
};
