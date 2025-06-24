import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { bookService } from '../../services/bookService';

const AdvancedSearchModal = ({ isOpen, onClose, onSearch }) => {
  const [searchCriteria, setSearchCriteria] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    status: '',
    rating: { min: '', max: '' },
    pageCount: { min: '', max: '' },
    dateRange: { start: '', end: '' },
    tags: '',
    notes: '',
    hasRating: false,
    hasNotes: false
  });

  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGenres();
    }
  }, [isOpen]);

  const fetchGenres = async () => {
    try {
      const response = await bookService.getBooksByGenre();
      setGenres(response.data.genres || []);
    } catch (error) {
      console.error('Failed to fetch genres:', error);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSearchCriteria(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSearchCriteria(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSearch = () => {
    // Filter out empty values
    const filteredCriteria = Object.entries(searchCriteria).reduce((acc, [key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const filteredObject = Object.entries(value).reduce((objAcc, [objKey, objValue]) => {
          if (objValue !== '' && objValue !== null && objValue !== undefined) {
            objAcc[objKey] = objValue;
          }
          return objAcc;
        }, {});
        
        if (Object.keys(filteredObject).length > 0) {
          acc[key] = filteredObject;
        }
      } else if (value !== '' && value !== null && value !== undefined && value !== false) {
        acc[key] = value;
      }
      return acc;
    }, {});

    onSearch(filteredCriteria);
    onClose();
  };

  const handleReset = () => {
    setSearchCriteria({
      title: '',
      author: '',
      isbn: '',
      genre: '',
      status: '',
      rating: { min: '', max: '' },
      pageCount: { min: '', max: '' },
      dateRange: { start: '', end: '' },
      tags: '',
      notes: '',
      hasRating: false,
      hasNotes: false
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Advanced Search"
      size="lg"
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={searchCriteria.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="input"
                placeholder="Search by title..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Author
              </label>
              <input
                type="text"
                value={searchCriteria.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                className="input"
                placeholder="Search by author..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ISBN
              </label>
              <input
                type="text"
                value={searchCriteria.isbn}
                onChange={(e) => handleInputChange('isbn', e.target.value)}
                className="input"
                placeholder="Search by ISBN..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <select
                value={searchCriteria.genre}
                onChange={(e) => handleInputChange('genre', e.target.value)}
                className="input"
              >
                <option value="">All Genres</option>
                {genres.map((genre) => (
                  <option key={genre._id} value={genre._id}>
                    {genre._id} ({genre.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status and Rating */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Rating</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reading Status
              </label>
              <select
                value={searchCriteria.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={searchCriteria.rating.min}
                  onChange={(e) => handleInputChange('rating.min', e.target.value)}
                  className="input"
                  placeholder="Min"
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={searchCriteria.rating.max}
                  onChange={(e) => handleInputChange('rating.max', e.target.value)}
                  className="input"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Page Count and Date Range */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Count Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  value={searchCriteria.pageCount.min}
                  onChange={(e) => handleInputChange('pageCount.min', e.target.value)}
                  className="input"
                  placeholder="Min pages"
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="number"
                  min="1"
                  value={searchCriteria.pageCount.max}
                  onChange={(e) => handleInputChange('pageCount.max', e.target.value)}
                  className="input"
                  placeholder="Max pages"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Added Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={searchCriteria.dateRange.start}
                  onChange={(e) => handleInputChange('dateRange.start', e.target.value)}
                  className="input"
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="date"
                  value={searchCriteria.dateRange.end}
                  onChange={(e) => handleInputChange('dateRange.end', e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tags and Notes */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Content Search</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={searchCriteria.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="input"
                placeholder="fiction, classic, favorite..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes Content
              </label>
              <input
                type="text"
                value={searchCriteria.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="input"
                placeholder="Search in notes..."
              />
            </div>
          </div>
        </div>

        {/* Special Filters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Special Filters</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={searchCriteria.hasRating}
                onChange={(e) => handleInputChange('hasRating', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Only books with ratings</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={searchCriteria.hasNotes}
                onChange={(e) => handleInputChange('hasNotes', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Only books with notes</span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Modal.Footer>
        <Button onClick={handleReset} variant="ghost">
          Reset
        </Button>
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button onClick={handleSearch} variant="primary">
          Search
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AdvancedSearchModal;
