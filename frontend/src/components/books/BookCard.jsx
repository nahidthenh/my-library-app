import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Modal } from '../common';
import { bookService } from '../../services/bookService';

const BookCard = ({ book, onEdit, onDelete, onStatusUpdate }) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      default:
        return status;
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === book.status) return;

    setIsUpdatingStatus(true);
    try {
      await bookService.updateBookStatus(book._id, newStatus);
      onStatusUpdate && onStatusUpdate(book._id, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update book status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await bookService.deleteBook(book._id);
      onDelete && onDelete(book._id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete book:', error);
      alert('Failed to delete book. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStars = (rating) => {
    if (!rating) return null;

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating})</span>
      </div>
    );
  };

  return (
    <>
      <Card hover className="h-full flex flex-col">
        <div className="flex-1">
          {/* Cover Image */}
          <div className="aspect-w-3 aspect-h-4 mb-4">
            <img
              src={book.coverImage || '/default-book-cover.png'}
              alt={book.title}
              className="w-full h-48 object-cover rounded-md bg-gray-100"
              onError={(e) => {
                e.target.src = '/default-book-cover.png';
              }}
            />
          </div>

          {/* Book Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2" title={book.title}>
              {book.title}
            </h3>

            <p className="text-sm text-gray-600" title={book.author}>
              by {book.author}
            </p>

            {book.genre && (
              <p className="text-xs text-gray-500">
                {book.genre}
              </p>
            )}

            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(book.status)}`}>
                {getStatusText(book.status)}
              </span>

              {book.progressPercentage > 0 && (
                <span className="text-xs text-gray-500">
                  {book.progressPercentage}%
                </span>
              )}
            </div>

            {/* Rating */}
            {book.rating && (
              <div className="flex items-center">
                {renderStars(book.rating)}
              </div>
            )}

            {/* Progress Bar */}
            {book.pageCount && book.currentPage > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span>{book.currentPage} / {book.pageCount} pages</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${book.progressPercentage || 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {book.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {book.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{book.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {/* Status Update */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Update Status
            </label>
            <select
              value={book.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdatingStatus}
              className="block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/books/${book._id}`)}
              className="flex-1"
            >
              View
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(book)}
              className="flex-1"
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Book"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete "{book.title}"? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={isDeleting}
              disabled={isDeleting}
            >
              Delete Book
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BookCard;
