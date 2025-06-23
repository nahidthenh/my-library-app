import React, { useState, useEffect } from 'react';
import { Button, Input, Card } from '../common';
import { bookService } from '../../services/bookService';

const BookForm = ({ book = null, onSubmit, onCancel, isLoading = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    description: '',
    coverImage: '',
    pageCount: '',
    status: 'not_started',
    rating: '',
    notes: '',
    tags: '',
    publicationDate: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form if editing existing book
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        genre: book.genre || '',
        description: book.description || '',
        coverImage: book.coverImage || '',
        pageCount: book.pageCount || '',
        status: book.status || 'not_started',
        rating: book.rating || '',
        notes: book.notes || '',
        tags: book.tags ? book.tags.join(', ') : '',
        publicationDate: book.publicationDate ? book.publicationDate.split('T')[0] : ''
      });
    }
  }, [book]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }

    if (formData.pageCount && (isNaN(formData.pageCount) || parseInt(formData.pageCount) < 1)) {
      newErrors.pageCount = 'Page count must be a positive number';
    }

    if (formData.rating && (isNaN(formData.rating) || parseInt(formData.rating) < 1 || parseInt(formData.rating) > 5)) {
      newErrors.rating = 'Rating must be between 1 and 5';
    }

    if (formData.coverImage && !isValidUrl(formData.coverImage)) {
      newErrors.coverImage = 'Please enter a valid image URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(string);
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        pageCount: formData.pageCount ? parseInt(formData.pageCount) : undefined,
        rating: formData.rating ? parseInt(formData.rating) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        publicationDate: formData.publicationDate || undefined
      };

      // Remove empty fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === undefined) {
          delete submitData[key];
        }
      });

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <Card.Header>
        <h2 className="text-xl font-semibold text-gray-900">
          {book ? 'Edit Book' : 'Add New Book'}
        </h2>
      </Card.Header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
            placeholder="Enter book title"
          />

          <Input
            label="Author"
            name="author"
            value={formData.author}
            onChange={handleChange}
            error={errors.author}
            required
            placeholder="Enter author name"
          />

          <Input
            label="ISBN"
            name="isbn"
            value={formData.isbn}
            onChange={handleChange}
            error={errors.isbn}
            placeholder="Enter ISBN (optional)"
          />

          <Input
            label="Genre"
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            error={errors.genre}
            placeholder="Enter genre"
          />

          <Input
            label="Page Count"
            name="pageCount"
            type="number"
            value={formData.pageCount}
            onChange={handleChange}
            error={errors.pageCount}
            placeholder="Number of pages"
            min="1"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <Input
          label="Cover Image URL"
          name="coverImage"
          value={formData.coverImage}
          onChange={handleChange}
          error={errors.coverImage}
          placeholder="https://example.com/cover.jpg"
          helperText="Enter a direct link to the book cover image"
        />

        <Input
          label="Publication Date"
          name="publicationDate"
          type="date"
          value={formData.publicationDate}
          onChange={handleChange}
          error={errors.publicationDate}
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter book description..."
          />
        </div>

        <Input
          label="Tags"
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="fiction, mystery, thriller (comma-separated)"
          helperText="Separate tags with commas"
        />

        {formData.status === 'completed' && (
          <Input
            label="Rating"
            name="rating"
            type="number"
            value={formData.rating}
            onChange={handleChange}
            error={errors.rating}
            placeholder="Rate 1-5 stars"
            min="1"
            max="5"
          />
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Personal notes about this book..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {book ? 'Update Book' : 'Add Book'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default BookForm;
