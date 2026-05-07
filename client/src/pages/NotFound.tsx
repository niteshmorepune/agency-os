import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mt-4">Page not found</h2>
      <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary mt-6">Go to Dashboard</Link>
    </div>
  );
}
