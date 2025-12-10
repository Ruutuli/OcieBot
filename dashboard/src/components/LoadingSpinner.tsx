import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner loading-spinner-${size} ${className}`}>
      <div className="spinner"></div>
    </div>
  );
}

