import React from 'react';

export default function Loading({ message = 'Loading...', fullScreen = true }) {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-gray-600 text-sm font-medium">{message}</p>
    </div>
  );

  if (!fullScreen) {
    return content;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {content}
    </div>
  );
}
