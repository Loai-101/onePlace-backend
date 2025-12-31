const Report = require('../models/Report');
const User = require('../models/User');
const Company = require('../models/Company');
const { uploadFile } = require('../utils/supabase');

// Import jsPDF - try different import methods
let jsPDF;
try {
  // Try default export first
  jsPDF = require('jspdf');
  // If it's an object with jsPDF property, use that
  if (jsPDF.jsPDF) {
    jsPDF = jsPDF.jsPDF;
  }
} catch (error) {
  console.error('Failed to import jsPDF:', error);
  throw new Error('jsPDF library is not properly installed. Please run: npm install jspdf');
}

// @desc    Upload report file
// @route   POST /api/reports/upload
// @access  Private (Salesman only)
const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Report title is required'
      });
    }

    // Get salesman and company info
    const salesman = await User.findById(req.user.id);
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Upload file to Supabase
    const fileBuffer = req.file.buffer;
    const fileName = `${Date.now()}-${req.file.originalname}`;
    
    let uploadResult;
    try {
      uploadResult = await uploadFile(
        fileBuffer, 
        fileName, 
        'reports', 
        `reports/${req.user.id}`,
        req.file.mimetype
      );
    } catch (uploadError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file: ' + uploadError.message
      });
    }

    // Create report record
    const report = await Report.create({
      salesman: req.user.id,
      salesmanName: salesman.name,
      company: req.user.company,
      title: title.trim(),
      description: description ? description.trim() : '',
      reportType: 'file',
      fileUrl: uploadResult.url,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    res.status(201).json({
      success: true,
      message: 'Report uploaded successfully',
      data: report
    });
  } catch (error) {
    console.error('Upload report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading report: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Create report and save as PDF
// @route   POST /api/reports/pdf
// @access  Private (Salesman only)
const createPdfReport = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Report title is required'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Report description is required'
      });
    }

    // Get salesman and company info
    const salesman = await User.findById(req.user.id);
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Format date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Create PDF
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Sales Report', 20, 20);
    
    // Salesman info
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Salesman: ${salesman.name}`, 20, 35);
    doc.text(`Date: ${dateStr}`, 20, 42);
    doc.text(`Time: ${timeStr}`, 20, 49);
    
    // Title
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('Title:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const titleLines = doc.splitTextToSize(title.trim(), 170);
    doc.text(titleLines, 20, 67);
    
    // Description
    let yPos = 67 + (titleLines.length * 6) + 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    yPos += 7;
    
    const descriptionLines = doc.splitTextToSize(description.trim(), 170);
    let currentY = yPos;
    
    // Handle page breaks for long descriptions
    descriptionLines.forEach((line, index) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, 20, currentY);
      currentY += 6;
    });
    
    // Footer
    try {
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated by OnePlace PMS - Page ${i} of ${pageCount}`,
          105,
          285,
          { align: 'center' }
        );
      }
    } catch (footerError) {
      console.warn('Footer generation error (non-critical):', footerError.message);
      // Continue without footer if it fails
    }

    // Convert PDF to buffer
    let pdfBuffer;
    try {
      // jsPDF output('arraybuffer') returns an ArrayBuffer
      const arrayBuffer = doc.output('arraybuffer');
      // Convert ArrayBuffer to Buffer - handle both ArrayBuffer and Uint8Array
      if (arrayBuffer instanceof ArrayBuffer) {
        pdfBuffer = Buffer.from(arrayBuffer);
      } else if (arrayBuffer instanceof Uint8Array) {
        pdfBuffer = Buffer.from(arrayBuffer);
      } else {
        // Fallback: try to convert to string first
        const pdfString = doc.output('arraybuffer');
        pdfBuffer = Buffer.from(pdfString);
      }
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      console.error('PDF error details:', {
        message: pdfError.message,
        stack: pdfError.stack,
        name: pdfError.name
      });
      // Try alternative method using 'uint8array'
      try {
        const uint8Array = doc.output('uint8array');
        pdfBuffer = Buffer.from(uint8Array);
      } catch (altError) {
        console.error('Alternative PDF generation also failed:', altError);
        throw new Error('Failed to generate PDF buffer: ' + pdfError.message);
      }
    }

    // Upload PDF to Supabase
    const fileName = `${Date.now()}-${title.trim().replace(/[^a-z0-9]/gi, '_')}.pdf`;
    
    let uploadResult;
    try {
      uploadResult = await uploadFile(
        pdfBuffer, 
        fileName, 
        'reports', 
        `reports/${req.user.id}`,
        'application/pdf'
      );
    } catch (uploadError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload PDF: ' + uploadError.message
      });
    }

    // Create report record
    const report = await Report.create({
      salesman: req.user.id,
      salesmanName: salesman.name,
      company: req.user.company,
      title: title.trim(),
      description: description.trim(),
      reportType: 'pdf',
      pdfUrl: uploadResult.url
    });

    res.status(201).json({
      success: true,
      message: 'Report saved as PDF successfully',
      data: report
    });
  } catch (error) {
    console.error('Create PDF report error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error creating PDF report: ' + (error.message || 'Unknown error'),
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private (Owner only)
const getReports = async (req, res) => {
  try {
    // Only owner and admin can view all reports
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only owner and admin can view reports'
      });
    }

    const { salesman, startDate, endDate } = req.query;

    // Build query
    let query = {};

    // Filter by salesman
    if (salesman && salesman !== 'all') {
      query.salesman = salesman;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Get reports
    const reports = await Report.find(query)
      .populate('salesman', 'name email')
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private (Owner or Salesman who created it)
const getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('salesman', 'name email')
      .populate('company', 'name');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check permissions - Owner, Admin, or Salesman who created it
    if (req.user.role !== 'owner' && req.user.role !== 'admin' && report.salesman._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this report'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private (Owner only)
const deleteReport = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only owner and admin can delete reports'
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // TODO: Delete file from Supabase if needed

    await Report.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report: ' + (error.message || 'Unknown error')
    });
  }
};

module.exports = {
  uploadReport,
  createPdfReport,
  getReports,
  getReport,
  deleteReport
};

