// @desc    Get upcoming events
// @route   GET /api/student/events/upcoming
// @access  Private (Student)
exports.getUpcomingEvents = async (req, res) => {
  try {
    const upcomingEvents = [
      {
        id: 1,
        name: "Annual Debate Competition",
        society: "Literary Club",
        dateTime: "2026-03-15, 10:00 AM",
        venue: "Main Auditorium",
        ticketPrice: 500,
        description: "Clash of intellects and speaking skills."
      },
      {
        id: 2,
        name: "Startup Pitch Night",
        society: "Entrepreneur Soc.",
        dateTime: "2025-10-02, 06:00 PM",
        venue: "Seminar Room 301",
        ticketPrice: 0,
        description: "Watch students pitch their ideas."
      }
    ];

    res.json({
      success: true,
      data: upcomingEvents
    });
  } catch (error) {
    console.error('Get Upcoming Events Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming events'
    });
  }
};



// @desc    Get registered events
// @route   GET /api/student/events/registered
// @access  Private (Student)
exports.getRegisteredEvents = async (req, res) => {
  try {
    const registeredEvents = [
      {
        name: "Charity Fun Run",
        society: "Sports Committee",
        dateTime: "2025-12-01, 08:00 AM",
        venue: "Main Field",
        description: "Run for a cause"
      }
    ];

    res.json({
      success: true,
      data: registeredEvents
    });
  } catch (error) {
    console.error('Get Registered Events Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registered events'
    });
  }
};



// @desc    Get past events
// @route   GET /api/student/events/past
// @access  Private (Student)
exports.getPastEvents = async (req, res) => {
  try {
    const pastEvents = [
      {
        name: "Tech Talk 2024",
        society: "CS Club",
        dateTime: "2024-05-12, 02:00 PM",
        venue: "Lab 5",
        status: "Attended"
      },
      {
        name: "Music Night",
        society: "Music Society",
        dateTime: "2024-03-20, 07:00 PM",
        venue: "Open Ground",
        status: "Missed"
      }
    ];

    res.json({
      success: true,
      data: pastEvents
    });
  } catch (error) {
    console.error('Get Past Events Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching past events'
    });
  }
};



// @desc    Register event
// @route   POST /api/student/events/register
// @access  Private (Student)
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Event registered successfully'
    });
  } catch (error) {
    console.error('Register Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering event'
    });
  }
};
