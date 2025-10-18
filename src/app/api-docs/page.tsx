'use client';

import { useState, useEffect } from 'react';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  responses?: { code: number; description: string }[];
  example?: any;
  category: string;
}

const methodColors = {
  GET: 'bg-green-100 text-green-800 border-green-200',
  POST: 'bg-blue-100 text-blue-800 border-blue-200',
  PUT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200'
};

export default function ApiDocs() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEndpoints = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/api-docs');
        if (!response.ok) {
          throw new Error('Failed to fetch API documentation');
        }
        const data = await response.json();
        setEndpoints(data.endpoints || []);
        setError(null);
      } catch (err) {
        setError('Failed to load API documentation');
        console.error('Error loading endpoints:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEndpoints();
  }, []);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(type);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const refreshDocumentation = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/api-docs', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to refresh API documentation');
      }
      const data = await response.json();
      setEndpoints(data.endpoints || []);
      setError(null);
    } catch (err) {
      setError('Failed to refresh API documentation');
      console.error('Error refreshing endpoints:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePostmanCommand = (endpoint: ApiEndpoint) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const url = `${baseUrl}${endpoint.path}`;
    
    let command = '';
    if (endpoint.method === 'GET') {
      command = `curl -X GET "${url}"`;
    } else if (endpoint.method === 'POST') {
      command = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json"`;
      if (endpoint.example) {
        command += ` \\\n  -d '${JSON.stringify(endpoint.example, null, 2)}'`;
      }
    } else if (endpoint.method === 'PUT') {
      command = `curl -X PUT "${url}" \\\n  -H "Content-Type: application/json"`;
      if (endpoint.example) {
        command += ` \\\n  -d '${JSON.stringify(endpoint.example, null, 2)}'`;
      }
    } else if (endpoint.method === 'DELETE') {
      command = `curl -X DELETE "${url}"`;
    }
    
    return command;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">API Documentation</h1>
              <p className="text-gray-600">Complete API reference for your Shipping Single Point of Sale system</p>
            </div>
            <button
              onClick={refreshDocumentation}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading API documentation...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium">Error Loading Documentation</h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={refreshDocumentation}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Endpoint List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Endpoints ({endpoints.length})</h2>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {endpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedEndpoint(endpoint)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedEndpoint === endpoint ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${methodColors[endpoint.method as keyof typeof methodColors]}`}>
                          {endpoint.method}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{endpoint.category}</span>
                      </div>
                      <div className="text-sm font-mono text-gray-700">{endpoint.path}</div>
                      <div className="text-xs text-gray-500 mt-1">{endpoint.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Endpoint Details */}
            <div className="lg:col-span-2">
              {selectedEndpoint ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 text-sm font-medium rounded border ${methodColors[selectedEndpoint.method as keyof typeof methodColors]}`}>
                          {selectedEndpoint.method}
                        </span>
                        <h3 className="text-xl font-semibold text-gray-900">{selectedEndpoint.path}</h3>
                      </div>
                      <button
                        onClick={() => copyToClipboard(generatePostmanCommand(selectedEndpoint), 'curl')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                      >
                        {copiedEndpoint === 'curl' ? 'Copied!' : 'Copy cURL'}
                      </button>
                    </div>
                    <p className="mt-3 text-gray-600">{selectedEndpoint.description}</p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Parameters */}
                    {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Parameters</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedEndpoint.parameters.map((param, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-sm font-mono text-gray-900">{param.name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{param.type}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`px-2 py-1 text-xs rounded ${param.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                      {param.required ? 'Required' : 'Optional'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {selectedEndpoint.body && selectedEndpoint.body.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Request Body</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedEndpoint.body.map((field, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-sm font-mono text-gray-900">{field.name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{field.type}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`px-2 py-1 text-xs rounded ${field.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                      {field.required ? 'Required' : 'Optional'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{field.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Example */}
                    {selectedEndpoint.example && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Example</h4>
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{JSON.stringify(selectedEndpoint.example, null, 2)}</code>
                          </pre>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.example, null, 2), 'example')}
                            className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                          >
                            {copiedEndpoint === 'example' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Responses */}
                    {selectedEndpoint.responses && selectedEndpoint.responses.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Responses</h4>
                        <div className="space-y-2">
                          {selectedEndpoint.responses.map((response, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                response.code < 300 ? 'bg-green-100 text-green-800' : 
                                response.code < 400 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {response.code}
                              </span>
                              <span className="text-sm text-gray-700">{response.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* cURL Command */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">cURL Command</h4>
                      <div className="relative">
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{generatePostmanCommand(selectedEndpoint)}</code>
                        </pre>
                        <button
                          onClick={() => copyToClipboard(generatePostmanCommand(selectedEndpoint), 'command')}
                          className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                        >
                          {copiedEndpoint === 'command' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="text-gray-400">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select an endpoint</h3>
                    <p className="text-gray-500">Choose an endpoint from the list to view its documentation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Postman Collection Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Postman Collection</h2>
          <p className="text-gray-600 mb-4">
            You can import this collection directly into Postman to test all endpoints:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Import Steps:</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Open Postman</li>
              <li>Click "Import" in the top left</li>
              <li>Select "File" tab</li>
              <li>Choose the <code className="bg-gray-200 px-2 py-1 rounded text-xs">postman-collection.json</code> file from your project root</li>
              <li>Click "Import"</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Auto-refresh:</strong> This documentation automatically updates when you modify your API routes. Click the "Refresh" button to manually update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}