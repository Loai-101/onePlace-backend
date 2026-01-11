const Order = require('../models/Order');
const Product = require('../models/Product');
const Company = require('../models/Company');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      orderType,
      company,
      orderStatus,
      startDate,
      endDate,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Filter by user's company for all roles
    if (req.user.company) {
      query['customer.company'] = req.user.company;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Order type filter
    if (orderType) {
      query.orderType = orderType;
    }

    // Additional company filter (if provided, must match user's company)
    if (company) {
      // Ensure the requested company matches user's company
      if (company !== req.user.company?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access orders from your company.'
        });
      }
      query['customer.company'] = company;
    }

    // For salesmen, only show their own orders
    if (req.user.role === 'salesman') {
      query.createdBy = req.user._id;
    }

    // Order status filter
    if (orderStatus) {
      query.orderStatus = orderStatus;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const orders = await Order.find(query)
      .populate('customer.company', 'name location')
      .populate('items.product', 'name sku brand category pricing')
      .populate('createdBy', 'name email role')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer.company', 'name location contactInfo paymentInfo')
      .populate('items.product', 'name sku brand category specifications')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user's company
    if (req.user.company && order.customer?.company?._id?.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access orders from your company.'
      });
    }

    // For salesmen, only allow access to their own orders
    if (req.user.role === 'salesman' && order.createdBy?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own orders.'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    // Validate that the order's company matches user's company
    if (orderData.customer?.company) {
      if (orderData.customer.company.toString() !== req.user.company?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only create orders for your company.'
        });
      }
    } else if (req.user.company) {
      // If company not provided, set it to user's company
      orderData.customer = orderData.customer || {};
      orderData.customer.company = req.user.company;
    }

    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;

    // Process items and calculate totals
    for (let item of orderData.items) {
      const product = await Product.findById(item.product)
        .populate('brand', 'name')
        .populate('category', 'name');
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      // Verify product belongs to user's company
      if (req.user.company && product.company) {
        if (product.company.toString() !== req.user.company.toString()) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Product "${product.name}" does not belong to your company.`
          });
        }
      } else if (req.user.company && !product.company) {
        // Product missing company field (old data) - reject for security
        return res.status(403).json({
          success: false,
          message: `Access denied. Product "${product.name}" is not associated with a company.`
        });
      }

      // Update product stock
      await product.updateStock(item.quantity, 'subtract');

      // Calculate item totals
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemVat = itemSubtotal * (item.vatRate / 100);

      subtotal += itemSubtotal;
      totalVat += itemVat;

      // Set item data - use provided values or from product
      item.productName = item.productName || product.name;
      item.brand = item.brand || (product.brand?.name || product.brand || 'Unknown');
      item.category = item.category || (product.category?.name || product.category || 'Unknown');
      item.vatAmount = itemVat;
      item.totalPrice = itemSubtotal + itemVat;
    }

    // Calculate delivery cost
    const deliveryCost = subtotal >= 50 ? 0 : 2;

    // Set pricing
    orderData.pricing = {
      subtotal,
      deliveryCost,
      totalVat,
      total: subtotal + deliveryCost + totalVat,
      currency: 'BD'
    };

    // Set created by
    orderData.createdBy = req.user.id;

    // Create order
    const order = await Order.create(orderData);

    // If payment method is Credit, deduct from account's currentBalance immediately
    if (orderData.payment?.method === 'credit' && order.pricing?.total) {
      try {
        const Account = require('../models/Account');
        const accountName = orderData.customer?.companyName;
        
        if (accountName) {
          const account = await Account.findOne({ name: accountName });
          if (account) {
            account.currentBalance = (account.currentBalance || 0) + order.pricing.total;
            await account.save();
          }
        }
      } catch (accountError) {
        console.error('Error updating account balance on order creation:', accountError);
        // Don't fail the order creation if account update fails
      }
    }

    // Update company sales history and balance
    try {
      const company = await Company.findById(orderData.customer.company);
      if (company && company.salesHistory) {
        for (let item of orderData.items) {
          company.salesHistory.push({
            productId: item.product,
            productName: item.productName,
            brand: item.brand,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            paymentType: orderData.payment.method,
            orderDate: new Date(),
            orderId: order._id
          });
        }
        await company.save();
      }
    } catch (companyError) {
      console.error('Error updating company sales history:', companyError);
      // Don't fail the order creation if company update fails
    }

    // Populate and return order
    const populatedOrder = await Order.findById(order._id)
      .populate('customer.company', 'name location')
      .populate('items.product', 'name sku brand category pricing')
      .populate('createdBy', 'name email role');

    res.status(201).json({
      success: true,
      data: populatedOrder
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating order',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user's company
    if (req.user.company && order.customer?.company?._id?.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update orders from your company.'
      });
    }

    // For salesmen, only allow updates to their own orders
    if (req.user.role === 'salesman' && order.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own orders.'
      });
    }

    // Check if status is being changed to APPROVED
    const isApproving = req.body.accountantReviewStatus === 'APPROVED' && 
                       order.accountantReviewStatus !== 'APPROVED';
    
    // If accountant is updating accountantReviewStatus, sync it to status field for admin and salesman visibility
    if (req.user.role === 'accountant' && req.body.accountantReviewStatus) {
      // Map accountantReviewStatus to regular status
      const statusMap = {
        'PENDING_REVIEW': 'pending',
        'UNDER_REVIEW': 'processing',
        'APPROVED': 'confirmed',
        'REJECTED': 'cancelled',
        'CANCELLED': 'cancelled'
      };
      
      // Update the regular status field to match accountantReviewStatus
      req.body.status = statusMap[req.body.accountantReviewStatus] || order.status;
    }
    
    // Set updated by
    req.body.updatedBy = req.user.id;

    // Recalculate totals if items changed
    if (req.body.items) {
      order.calculateTotals();
    }

    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('customer.company', 'name location')
      .populate('items.product', 'name sku brand category pricing')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    // If payment status is being changed to 'paid' for a credit order, restore credit limit
    const isMarkingPaid = req.body.payment?.status === 'paid' && 
                         updatedOrder.payment?.method === 'credit' &&
                         order.payment?.status !== 'paid';
    
    if (isMarkingPaid && updatedOrder.pricing?.total) {
      try {
        const Account = require('../models/Account');
        const accountName = updatedOrder.customer?.companyName;
        
        if (accountName) {
          const account = await Account.findOne({ name: accountName });
          if (account) {
            // Restore credit limit by subtracting the order total
            account.currentBalance = Math.max(0, (account.currentBalance || 0) - updatedOrder.pricing.total);
            await account.save();
          }
        }
      } catch (accountError) {
        console.error('Error restoring account balance:', accountError);
        // Don't fail the order update if account update fails
      }
    }

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order'
    });
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user's company
    if (req.user.company && order.customer?.company?._id?.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update orders from your company.'
      });
    }

    // For salesmen, only allow status updates to their own orders
    if (req.user.role === 'salesman' && order.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own orders.'
      });
    }

    await order.updateStatus(status, req.user.id);

    const updatedOrder = await Order.findById(req.params.id)
      .populate('customer.company', 'name location')
      .populate('items.product', 'name sku brand category pricing')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (Owner/Admin)
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user's company
    if (req.user.company && order.customer?.company?._id?.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete orders from your company.'
      });
    }

    // Restore product stock
    for (let item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        await product.updateStock(item.quantity, 'add');
      }
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting order'
    });
  }
};

// @desc    Get orders by company
// @route   GET /api/orders/company/:companyId
// @access  Private
const getOrdersByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    // Ensure the requested company matches user's company
    if (companyId !== req.user.company?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access orders from your company.'
      });
    }

    const orders = await Order.getByCompany(companyId, parseInt(limit), parseInt(skip));

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders by company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company orders'
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/statistics
// @access  Private (Owner/Admin/Accountant)
const getOrderStatistics = async (req, res) => {
  try {
    // Filter by user's company
    let query = {};
    if (req.user.company) {
      query['customer.company'] = req.user.company;
    }

    // For salesmen, only their own orders
    if (req.user.role === 'salesman') {
      query.createdBy = req.user._id;
    }

    const stats = await Order.getStatistics(query);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get order statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order statistics'
    });
  }
};

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrdersByCompany,
  getOrderStatistics
};
