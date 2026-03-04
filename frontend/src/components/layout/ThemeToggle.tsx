// src/components/layout/ThemeToggle.tsx
import { useTheme } from "@/context/themeContext";

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="
        inline-flex items-center justify-center w-9 h-9 rounded-full 
        border border-border bg-card text-primary 
        hover:border-primary hover:bg-muted 
        transition-all
      "
      title={isDark ? "Switch to Light" : "Switch to Dark"}
    >
      {isDark ? (
        // ☀️
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364L17.95 6.05M6.05 17.95l-1.414 1.414M17.95 17.95l-1.414-1.414M6.05 6.05 4.636 4.636M12 8a4 4 0 100 8 4 4 0 000-8z"
          />
        </svg>
      ) : (
        // 🌙
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 118.646 3.646 7 7 0 0020.354 15.354z"
          />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
