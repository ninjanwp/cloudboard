import * as FaIcons from "react-icons/fa6";

type Size = "S" | "M" | "L" | "XL";

type IndicatorStyle = "boxes" | "icons" | "bars" | "text";

type SizeIndicatorProps = {
  size: Size;
  style?: IndicatorStyle;
  className?: string;
};

const sizeToIcon = {
  "S": <FaIcons.FaCircle className="w-3 h-3" />,
  "M": <FaIcons.FaCircle className="w-4 h-4" />,
  "L": <FaIcons.FaCircle className="w-5 h-5" />,
  "XL": <FaIcons.FaCircle className="w-6 h-6" />,
};

const sizeToText = {
  "S": "Small",
  "M": "Medium",
  "L": "Large",
  "XL": "Extra Large",
};

export const SizeIndicator = ({ size, style = "boxes", className = "" }: SizeIndicatorProps) => {
  if (style === "icons") {
    return (
      <div className={`flex items-center ${className}`}>
        {sizeToIcon[size]}
      </div>
    );
  }

  if (style === "text") {
    return (
      <div className={`text-sm text-[var(--text)] ${className}`}>
        {sizeToText[size]}
      </div>
    );
  }

  if (style === "bars") {
    const boxes = ["S", "M", "L", "XL"];
    const sizeIndex = boxes.indexOf(size);
    
    return (
      <div className={`w-16 h-3 bg-[var(--surface)] rounded overflow-hidden ${className}`}>
        <div 
          className="h-full bg-[var(--accent)] transition-all" 
          style={{ width: `${((sizeIndex + 1) / 4) * 100}%` }}
        />
      </div>
    );
  }

  // Default boxes style
  const boxes = ["S", "M", "L", "XL"];
  const sizeIndex = boxes.indexOf(size);
  
  return (
    <div className={`flex gap-1 ${className}`}>
      {boxes.map((_, index) => (
        <div
          key={index}
          className={`w-3 h-3 border rounded-sm ${
            index <= sizeIndex
              ? "bg-[var(--accent)] border-[var(--border)]"
              : "bg-[var(--surface)] border-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );
};
