const UserActivity = require('../models/UserActivity')
const User = require('../models/User')

// Track user login
exports.trackLogin = async (req, res) => {
  try {
    const userId = req.user.id
    const companyId = req.user.company
    
    // Get IP address and user agent
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    const userAgent = req.headers['user-agent']
    
    // Create new activity entry
    const activity = await UserActivity.create({
      user: userId,
      company: companyId,
      loginTime: new Date(),
      ipAddress,
      userAgent,
      isActive: true,
      pages: []
    })
    
    res.status(201).json({
      success: true,
      data: activity
    })
  } catch (error) {
    console.error('Error tracking login:', error)
    res.status(500).json({
      success: false,
      message: 'Error tracking login activity'
    })
  }
}

// Track page visit
exports.trackPageVisit = async (req, res) => {
  try {
    const userId = req.user.id
    const { page, duration } = req.body
    
    if (!page) {
      return res.status(400).json({
        success: false,
        message: 'Page name is required'
      })
    }
    
    // Find the most recent active session for this user
    const activeSession = await UserActivity.findOne({
      user: userId,
      isActive: true
    }).sort({ loginTime: -1 })
    
    if (!activeSession) {
      // If no active session, create a new one (user might have refreshed)
      const companyId = req.user.company
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
      const userAgent = req.headers['user-agent']
      
      const newActivity = await UserActivity.create({
        user: userId,
        company: companyId,
        loginTime: new Date(),
        ipAddress,
        userAgent,
        isActive: true,
        pages: [{
          page,
          visitedAt: new Date(),
          duration: duration || 0
        }]
      })
      
      return res.status(201).json({
        success: true,
        data: newActivity
      })
    }
    
    // Check if this page was already visited in this session (avoid duplicates for same page)
    const existingPage = activeSession.pages.find(p => p.page === page)
    
    if (existingPage) {
      // Update the existing page entry with new visit time and duration
      existingPage.visitedAt = new Date()
      existingPage.duration = (existingPage.duration || 0) + (duration || 0)
    } else {
      // Add new page to existing session
      activeSession.pages.push({
        page,
        visitedAt: new Date(),
        duration: duration || 0
      })
    }
    
    // Mark as modified to ensure Mongoose saves the changes to the pages array
    activeSession.markModified('pages')
    
    // Save and verify
    const savedActivity = await activeSession.save()
    
    // Verify pages were saved
    const verifyActivity = await UserActivity.findById(savedActivity._id)
    console.log(`✅ Page visit tracked: User ${userId}, Page: ${page}, Total pages: ${verifyActivity.pages.length}`)
    console.log(`📄 Pages in database:`, verifyActivity.pages.map(p => p.page).join(', '))
    
    res.json({
      success: true,
      data: savedActivity,
      message: `Page visit tracked. Total pages: ${verifyActivity.pages.length}`
    })
  } catch (error) {
    console.error('Error tracking page visit:', error)
    res.status(500).json({
      success: false,
      message: 'Error tracking page visit'
    })
  }
}

// Track user logout
exports.trackLogout = async (req, res) => {
  try {
    const userId = req.user.id
    
    // Find the most recent active session
    const activeSession = await UserActivity.findOne({
      user: userId,
      isActive: true
    }).sort({ loginTime: -1 })
    
    if (activeSession) {
      activeSession.logoutTime = new Date()
      activeSession.isActive = false
      if (activeSession.loginTime) {
        activeSession.sessionDuration = Math.floor((new Date() - activeSession.loginTime) / 1000)
      }
      await activeSession.save()
    }
    
    res.json({
      success: true,
      message: 'Logout tracked successfully'
    })
  } catch (error) {
    console.error('Error tracking logout:', error)
    res.status(500).json({
      success: false,
      message: 'Error tracking logout'
    })
  }
}

// Get user activity history
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params
    const { date, startDate, endDate } = req.query
    
    // Verify user has permission (owner/admin can view any user, user can only view themselves)
    const requestingUser = req.user
    
    if (requestingUser.role !== 'owner' && requestingUser.role !== 'admin' && requestingUser.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own activity.'
      })
    }
    
    // Build query
    const query = { user: userId }
    
    // Filter by date
    if (date) {
      const filterDate = new Date(date)
      filterDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(filterDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      query.loginTime = {
        $gte: filterDate,
        $lt: nextDay
      }
    } else if (startDate || endDate) {
      query.loginTime = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        query.loginTime.$gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        query.loginTime.$lte = end
      }
    }
    
    // Get activities, sorted by login time (newest first)
    const activities = await UserActivity.find(query)
      .sort({ loginTime: -1 })
      .limit(100) // Limit to last 100 sessions
      .populate('user', 'name email username')
    
    // Format response
    const formattedActivities = activities.map(activity => {
      // Calculate duration string
      let durationStr = 'N/A'
      if (activity.sessionDuration) {
        const hours = Math.floor(activity.sessionDuration / 3600)
        const minutes = Math.floor((activity.sessionDuration % 3600) / 60)
        if (hours > 0) {
          durationStr = `${hours}h ${minutes}m`
        } else {
          durationStr = `${minutes}m`
        }
      } else if (activity.isActive) {
        // If still active, calculate from login time
        const activeDuration = Math.floor((new Date() - activity.loginTime) / 1000)
        const hours = Math.floor(activeDuration / 3600)
        const minutes = Math.floor((activeDuration % 3600) / 60)
        if (hours > 0) {
          durationStr = `${hours}h ${minutes}m (active)`
        } else {
          durationStr = `${minutes}m (active)`
        }
      }
      
      // Get unique pages visited - ensure pages array exists and is properly formatted
      let uniquePages = []
      if (activity.pages && Array.isArray(activity.pages) && activity.pages.length > 0) {
        // Extract page names from the pages array
        uniquePages = [...new Set(activity.pages.map(p => {
          // Handle both object format {page: "PageName"} and string format
          if (typeof p === 'object' && p !== null) {
            return p.page || p.name || String(p)
          }
          return String(p)
        }).filter(Boolean))]
      }
      
      console.log(`📊 Activity ${activity._id}: ${uniquePages.length} pages - ${uniquePages.join(', ') || 'none'}`)
      
      return {
        id: activity._id,
        loginTime: activity.loginTime,
        logoutTime: activity.logoutTime,
        pages: uniquePages,
        duration: durationStr,
        sessionDuration: activity.sessionDuration,
        isActive: activity.isActive,
        ipAddress: activity.ipAddress
      }
    })
    
    res.json({
      success: true,
      count: formattedActivities.length,
      data: formattedActivities
    })
  } catch (error) {
    console.error('Error getting user activity:', error)
    res.status(500).json({
      success: false,
      message: 'Error getting user activity'
    })
  }
}

// Get all activities for a company (owner/admin only)
exports.getCompanyActivities = async (req, res) => {
  try {
    const requestingUser = req.user
    
    if (requestingUser.role !== 'owner' && requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only owners and admins can view company activities.'
      })
    }
    
    const { date, startDate, endDate, userId } = req.query
    const companyId = requestingUser.company
    
    // Build query
    const query = { company: companyId }
    
    if (userId) {
      query.user = userId
    }
    
    // Filter by date
    if (date) {
      const filterDate = new Date(date)
      filterDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(filterDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      query.loginTime = {
        $gte: filterDate,
        $lt: nextDay
      }
    } else if (startDate || endDate) {
      query.loginTime = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        query.loginTime.$gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        query.loginTime.$lte = end
      }
    }
    
    const activities = await UserActivity.find(query)
      .sort({ loginTime: -1 })
      .limit(500)
      .populate('user', 'name email username role')
    
    res.json({
      success: true,
      count: activities.length,
      data: activities
    })
  } catch (error) {
    console.error('Error getting company activities:', error)
    res.status(500).json({
      success: false,
      message: 'Error getting company activities'
    })
  }
}

