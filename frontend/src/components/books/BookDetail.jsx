import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../layout';
import { Button, Card, Modal } from '../common';
import BookForm from './BookForm';
import { bookService } from '../../services/bookService';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchBook();
  }, [id]);

  const fetchBook = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await bookService.getBook(id);
      setBook(response.data.book);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch book:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === book.status) return;

    setIsUpdatingStatus(true);
    try {
      await bookService.updateBookStatus(book._id, newStatus);
      setBook(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update book status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEdit = async (bookData) => {
    try {
      await bookService.updateBook(book._id, bookData);
      setBook(prev => ({ ...prev, ...bookData }));
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update book:', error);
      alert('Failed to update book. Please try again.');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await bookService.deleteBook(book._id);
      navigate('/books');
    } catch (error) {
      console.error('Failed to delete book:', error);
      alert('Failed to delete book. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

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

  const renderStars = (rating) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-sm text-gray-600 ml-2">({rating}/5)</span>
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading book details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !book) {
    return (
      <MainLayout>
        <Card className="text-center py-12">
          <div className="space-y-4">
            <div className="text-6xl">❌</div>
            <h3 className="text-lg font-medium text-gray-900">
              {error || 'Book not found'}
            </h3>
            <Button variant="primary" onClick={() => navigate('/books')}>
              Back to Books
            </Button>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => navigate('/books')}
          >
            ← Back to Books
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(true)}
            >
              Edit Book
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Book
            </Button>
          </div>
        </div>

        {/* Book Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cover Image */}
          <div className="lg:col-span-1">
            <Card>
              <img
                src={book.coverImage || '/default-book-cover.png'}
                alt={book.title}
                className="w-full h-auto rounded-lg"
                onError={(e) => {
                  e.target.src = '/default-book-cover.png';
                }}
              />
            </Card>
          </div>

          {/* Book Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
                  <p className="text-xl text-gray-600 mt-2">by {book.author}</p>
                </div>

                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(book.status)}`}>
                    {getStatusText(book.status)}
                  </span>
                  
                  {book.rating && renderStars(book.rating)}
                </div>

                {book.description && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{book.description}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Book Details */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-gray-900">Book Details</h3>
              </Card.Header>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {book.genre && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Genre</dt>
                    <dd className="text-sm text-gray-900">{book.genre}</dd>
                  </div>
                )}
                
                {book.isbn && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ISBN</dt>
                    <dd className="text-sm text-gray-900">{book.isbn}</dd>
                  </div>
                )}
                
                {book.publicationDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Publication Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(book.publicationDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                
                {book.pageCount && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Pages</dt>
                    <dd className="text-sm text-gray-900">{book.pageCount}</dd>
                  </div>
                )}
                
                {book.dateStarted && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date Started</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(book.dateStarted).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                
                {book.dateCompleted && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date Completed</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(book.dateCompleted).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </div>
            </Card>

            {/* Reading Progress */}
            {book.pageCount && (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-medium text-gray-900">Reading Progress</h3>
                </Card.Header>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progress</span>
                    <span>{book.currentPage || 0} / {book.pageCount} pages ({book.progressPercentage || 0}%)</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${book.progressPercentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </Card>
            )}

            {/* Status Update */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-gray-900">Update Status</h3>
              </Card.Header>
              
              <div className="space-y-3">
                <select
                  value={book.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  disabled={isUpdatingStatus}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                
                {isUpdatingStatus && (
                  <p className="text-sm text-gray-600">Updating status...</p>
                )}
              </div>
            </Card>

            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-medium text-gray-900">Tags</h3>
                </Card.Header>
                
                <div className="flex flex-wrap gap-2">
                  {book.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Notes */}
            {book.notes && (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-medium text-gray-900">Notes</h3>
                </Card.Header>
                
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {book.notes}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Book"
        size="lg"
      >
        <BookForm
          book={book}
          onSubmit={handleEdit}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

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
    </MainLayout>
  );
};

export default BookDetail;
