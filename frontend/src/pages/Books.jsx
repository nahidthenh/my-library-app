import React, { useState } from 'react';
import { MainLayout } from '../components/layout';
import { Modal } from '../components/common';
import BookList from '../components/books/BookList';
import BookForm from '../components/books/BookForm';
import { bookService } from '../services/bookService';

const Books = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddBook = () => {
    setEditingBook(null);
    setShowAddModal(true);
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingBook(null);
  };

  const handleSubmitBook = async (bookData) => {
    setIsSubmitting(true);
    
    try {
      if (editingBook) {
        // Update existing book
        await bookService.updateBook(editingBook._id, bookData);
      } else {
        // Create new book
        await bookService.createBook(bookData);
      }
      
      // Close modal and refresh book list
      handleCloseModals();
      setRefreshKey(prev => prev + 1); // Force refresh of BookList
      
    } catch (error) {
      console.error('Failed to save book:', error);
      alert(error.message || 'Failed to save book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <BookList 
        key={refreshKey}
        onAddBook={handleAddBook}
        onEditBook={handleEditBook}
      />

      {/* Add Book Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseModals}
        title="Add New Book"
        size="lg"
      >
        <BookForm
          onSubmit={handleSubmitBook}
          onCancel={handleCloseModals}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Edit Book Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseModals}
        title="Edit Book"
        size="lg"
      >
        <BookForm
          book={editingBook}
          onSubmit={handleSubmitBook}
          onCancel={handleCloseModals}
          isLoading={isSubmitting}
        />
      </Modal>
    </MainLayout>
  );
};

export default Books;
