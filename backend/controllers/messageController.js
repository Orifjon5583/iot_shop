const { prisma } = require('../config/db')
const { sendMessageNotification } = require('../bot')

// Barcha xabarlarni olish
exports.getAllMessages = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const where = status ? { status } : {}

    const messages = await prisma.message.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true, email: true } } },
    })

    const total = await prisma.message.count({ where })

    res.json({
      success: true,
      data: messages,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Bitta xabarni olish
exports.getMessageById = async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { username: true, email: true } } },
    })

    if (!message) {
      return res.status(404).json({ success: false, message: 'Xabar topilmadi' })
    }

    res.json({ success: true, data: message })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Xabar yaratish
exports.createMessage = async (req, res) => {
  try {
    const { userId, name, email, phone, subject, message } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Ism kiritilishi shart" })
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email kiritilishi shart" })
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: "Mavzu kiritilishi shart" })
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Xabar matni kiritilishi shart" })
    }

    const newMessage = await prisma.message.create({
      data: {
        userId: req.user?.id || null,
        name: name.trim(),
        email: email.trim(),
        phone: phone || null,
        subject: subject.trim(),
        message: message.trim(),
      },
    })

    // Telegram botga xabarnoma yuborish
    sendMessageNotification(newMessage);

    res.status(201).json({ success: true, data: newMessage })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Xabarni o'qish
exports.markAsRead = async (req, res) => {
  try {
    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { status: 'read' },
    })

    res.json({ success: true, data: message })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Xabarga javob berish
exports.replyToMessage = async (req, res) => {
  try {
    const { reply } = req.body
    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, message: "Javob matni kiritilishi shart" })
    }

    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { reply: reply.trim(), status: 'replied' },
    })

    res.json({ success: true, data: message })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Xabarni o'chirish
exports.deleteMessage = async (req, res) => {
  try {
    await prisma.message.delete({
      where: { id: req.params.id },
    })

    res.json({ success: true, message: 'Xabar o\'chirildi' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
