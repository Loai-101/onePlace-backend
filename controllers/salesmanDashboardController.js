const Order = require('../models/Order')
const Calendar = require('../models/Calendar')
const Report = require('../models/Report')
const User = require('../models/User')

// @desc    Get salesman dashboard statistics
// @route   GET /api/dashboard/salesman
// @access  Private (Salesman only)
const getSalesmanDashboard = async (req, res) => {
  try {
    const userId = req.user._id
    const companyId = req.user.company

    // Get date range (last 6 months by default)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    // Get all orders created by this salesman
    const allOrders = await Order.find({
      createdBy: userId,
      'customer.company': companyId
    })
      .populate('items.product', 'name sku mainCategory')
      .populate('customer.company', 'name')
      .sort({ createdAt: -1 })

    // Filter orders from last 6 months
    const recentOrders = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= sixMonthsAgo
    })

    // Calculate total statistics
    const totalOrders = allOrders.length
    const totalSales = allOrders.reduce((sum, order) => {
      const orderTotal = order.pricing?.total || order.totalAmount || order.total || 0
      return sum + (parseFloat(orderTotal) || 0)
    }, 0)

    // Calculate this month's statistics
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthOrders = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= startOfMonth
    })
    const thisMonthSales = thisMonthOrders.reduce((sum, order) => {
      const orderTotal = order.pricing?.total || order.totalAmount || order.total || 0
      return sum + (parseFloat(orderTotal) || 0)
    }, 0)

    // Order status breakdown
    const statusBreakdown = {}
    allOrders.forEach(order => {
      const status = order.accountantReviewStatus || order.status || order.orderStatus || 'pending' // Priority: accountantReviewStatus > status > orderStatus
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
    })

    // Monthly sales (last 6 months)
    const monthlySales = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

      const monthOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= monthStart && orderDate <= monthEnd
      })

      const monthSales = monthOrders.reduce((sum, order) => {
        const orderTotal = order.pricing?.total || order.totalAmount || order.total || 0
        return sum + (parseFloat(orderTotal) || 0)
      }, 0)

      monthlySales.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        sales: monthSales,
        orders: monthOrders.length
      })
    }

    // Top products sold (by quantity)
    const productSales = {}
    allOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.product?._id?.toString() || item.product?.toString()
          const productName = item.product?.name || 'Unknown Product'
          const quantity = item.quantity || 0

          if (productId) {
            if (!productSales[productId]) {
              productSales[productId] = {
                id: productId,
                name: productName,
                quantity: 0,
                sales: 0
              }
            }
            productSales[productId].quantity += quantity
            const itemTotal = (item.price || 0) * quantity
            productSales[productId].sales += itemTotal
          }
        })
      }
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Calendar events count
    const totalEvents = await Calendar.countDocuments({
      createdBy: userId,
      company: companyId
    })

    const upcomingEvents = await Calendar.countDocuments({
      createdBy: userId,
      company: companyId,
      date: { $gte: new Date() }
    })

    // Reports count
    const totalReports = await Report.countDocuments({
      salesman: userId,
      company: companyId
    })

    // Get user's target/forecast information
    const user = await User.findById(userId).select('salesmanInfo')
    let targetSales = null
    let forecast = null
    let targetSource = 'none'

    if (user && user.salesmanInfo) {
      if (user.salesmanInfo.targetSales) {
        targetSales = user.salesmanInfo.targetSales
        targetSource = 'target'
      } else if (user.salesmanInfo.forecast && Array.isArray(user.salesmanInfo.forecast)) {
        // Get current month's forecast
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const currentForecast = user.salesmanInfo.forecast.find(f => {
          const forecastDate = new Date(f.month)
          return forecastDate.getMonth() === currentMonth && forecastDate.getFullYear() === currentYear
        })
        if (currentForecast) {
          forecast = currentForecast.amount
          targetSource = 'forecast'
        }
      }
    }

    // Recent orders (last 10)
    const recentOrdersList = allOrders.slice(0, 10).map(order => ({
      id: order._id,
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      totalAmount: order.pricing?.total || order.totalAmount || order.total || 0,
      status: order.accountantReviewStatus || order.status || order.orderStatus || 'pending', // Priority: accountantReviewStatus > status > orderStatus
      createdAt: order.createdAt,
      customerName: order.customer?.companyName || order.customer?.accountName || 'N/A'
    }))

    // Calculate completion percentage if target exists
    let completionPercentage = null
    if (targetSales) {
      completionPercentage = (thisMonthSales / targetSales) * 100
    } else if (forecast) {
      completionPercentage = (thisMonthSales / forecast) * 100
    }

    res.status(200).json({
      success: true,
      data: {
        // Summary statistics
        summary: {
          totalOrders,
          totalSales,
          thisMonthOrders: thisMonthOrders.length,
          thisMonthSales,
          completionPercentage: completionPercentage ? Math.min(100, Math.max(0, completionPercentage)) : null,
          targetSales,
          forecast,
          targetSource,
          totalEvents,
          upcomingEvents,
          totalReports
        },
        // Charts data
        charts: {
          monthlySales,
          statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
            status: status.replace(/_/g, ' '), // Replace underscores with spaces for display
            count
          })),
          topProducts
        },
        // Recent orders
        recentOrders: recentOrdersList
      }
    })
  } catch (error) {
    console.error('Get salesman dashboard error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data: ' + (error.message || 'Unknown error')
    })
  }
}

module.exports = {
  getSalesmanDashboard
}

