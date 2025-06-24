import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { importExportService } from '../../services/importExportService';
import { useScreenReader } from '../../hooks/useAccessibility';

const ImportExportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState('export');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [error, setError] = useState('');
  const { announcePolite } = useScreenReader();

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      setError('');
      await importExportService.exportBooksCSV();
      announcePolite('Books exported to CSV successfully');
    } catch (error) {
      setError('Failed to export books to CSV');
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setLoading(true);
      setError('');
      await importExportService.exportBooksJSON();
      announcePolite('Books exported to JSON successfully');
    } catch (error) {
      setError('Failed to export books to JSON');
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setError('');
    setImportResults(null);
  };

  const handleImportCSV = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file');
      return;
    }

    const validation = importExportService.validateCSVFile(selectedFile);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await importExportService.importBooksCSV(selectedFile);
      setImportResults(result);
      announcePolite(`Successfully imported ${result.data.importedCount} books`);
      onImportSuccess?.();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to import books from CSV');
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportJSON = async () => {
    if (!selectedFile) {
      setError('Please select a JSON file');
      return;
    }

    const validation = importExportService.validateJSONFile(selectedFile);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await importExportService.importBooksJSON(selectedFile);
      setImportResults(result);
      announcePolite(`Successfully imported ${result.data.importedCount} books`);
      onImportSuccess?.();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to import books from JSON');
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setImportResults(null);
    setError('');
    setActiveTab('export');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import / Export Books"
      size="lg"
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'export'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📤 Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📥 Import
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {importResults && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium">{importResults.message}</p>
          <p className="text-xs text-green-600 mt-1">
            Imported: {importResults.data.importedCount} books
          </p>
          {importResults.data.errors?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-yellow-600">Warnings:</p>
              <ul className="text-xs text-yellow-600 list-disc list-inside">
                {importResults.data.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Export Your Library</h3>
            <p className="text-sm text-gray-600 mb-4">
              Download your complete book collection with all reading data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CSV Export */}
            <div className="card p-4">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <h4 className="font-medium text-gray-900">CSV Format</h4>
                  <p className="text-xs text-gray-500">Spreadsheet compatible</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Export as CSV for use in Excel, Google Sheets, or other spreadsheet applications.
              </p>
              <Button
                onClick={handleExportCSV}
                loading={loading}
                disabled={loading}
                variant="primary"
                size="sm"
                fullWidth
              >
                Export CSV
              </Button>
            </div>

            {/* JSON Export */}
            <div className="card p-4">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📋</span>
                <div>
                  <h4 className="font-medium text-gray-900">JSON Format</h4>
                  <p className="text-xs text-gray-500">Complete backup</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Export as JSON with complete data including user preferences and statistics.
              </p>
              <Button
                onClick={handleExportJSON}
                loading={loading}
                disabled={loading}
                variant="primary"
                size="sm"
                fullWidth
              >
                Export JSON
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import Books</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV or JSON file to add books to your library.
            </p>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <span className="text-4xl mb-2">📁</span>
              <span className="text-sm font-medium text-gray-900">
                Choose CSV or JSON file
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Maximum file size: 10MB
              </span>
            </label>
            
            {selectedFile && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium">Selected:</span> {selectedFile.name}
              </div>
            )}
          </div>

          {/* Import Actions */}
          {selectedFile && (
            <div className="flex space-x-3">
              <Button
                onClick={selectedFile.name.endsWith('.csv') ? handleImportCSV : handleImportJSON}
                loading={loading}
                disabled={loading}
                variant="success"
                fullWidth
              >
                Import {selectedFile.name.endsWith('.csv') ? 'CSV' : 'JSON'}
              </Button>
            </div>
          )}

          {/* Template Downloads */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Download Templates</h4>
            <div className="flex space-x-3">
              <Button
                onClick={importExportService.generateCSVTemplate}
                variant="ghost"
                size="sm"
              >
                📊 CSV Template
              </Button>
              <Button
                onClick={importExportService.generateJSONTemplate}
                variant="ghost"
                size="sm"
              >
                📋 JSON Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Modal.Footer>
        <Button onClick={handleClose} variant="secondary">
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImportExportModal;
