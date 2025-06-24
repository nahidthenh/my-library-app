import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Import/Export Service
export const importExportService = {
  // Export books to CSV
  exportBooksCSV: async () => {
    try {
      const response = await api.get('/import-export/books/csv', {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'library_export.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Books exported successfully' };
    } catch (error) {
      console.error('Error exporting books to CSV:', error);
      throw error;
    }
  },

  // Export books to JSON
  exportBooksJSON: async () => {
    try {
      const response = await api.get('/import-export/books/json', {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'library_export.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Books exported successfully' };
    } catch (error) {
      console.error('Error exporting books to JSON:', error);
      throw error;
    }
  },

  // Import books from CSV
  importBooksCSV: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/import-export/books/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error importing books from CSV:', error);
      throw error;
    }
  },

  // Import books from JSON
  importBooksJSON: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/import-export/books/json', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error importing books from JSON:', error);
      throw error;
    }
  },

  // Validate CSV file format
  validateCSVFile: (file) => {
    const errors = [];
    
    if (!file) {
      errors.push('Please select a file');
      return { valid: false, errors };
    }
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      errors.push('Please select a CSV file');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      errors.push('File size must be less than 10MB');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validate JSON file format
  validateJSONFile: (file) => {
    const errors = [];
    
    if (!file) {
      errors.push('Please select a file');
      return { valid: false, errors };
    }
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      errors.push('Please select a JSON file');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      errors.push('File size must be less than 10MB');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Generate sample CSV template
  generateCSVTemplate: () => {
    const headers = [
      'title',
      'author',
      'isbn',
      'genre',
      'pageCount',
      'status',
      'rating',
      'dateStarted',
      'dateCompleted',
      'currentPage',
      'notes',
      'tags'
    ];
    
    const sampleData = [
      'The Great Gatsby',
      'F. Scott Fitzgerald',
      '9780743273565',
      'Fiction',
      '180',
      'completed',
      '4.5',
      '2024-01-01',
      '2024-01-15',
      '180',
      'Classic American literature',
      'classic, american, 1920s'
    ];
    
    const csvContent = [
      headers.join(','),
      sampleData.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'books_import_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Generate sample JSON template
  generateJSONTemplate: () => {
    const template = {
      books: [
        {
          title: "The Great Gatsby",
          author: "F. Scott Fitzgerald",
          isbn: "9780743273565",
          genre: "Fiction",
          pageCount: 180,
          status: "completed",
          rating: 4.5,
          dateStarted: "2024-01-01",
          dateCompleted: "2024-01-15",
          currentPage: 180,
          notes: "Classic American literature",
          tags: ["classic", "american", "1920s"]
        }
      ]
    };
    
    const jsonContent = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'books_import_template.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default importExportService;
