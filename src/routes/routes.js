const express = require('express')
const router = express.Router()
const AvocatModel = require('../models/avocat.js')
const FileModel = require('../models/file.js')
const MissionModel = require('../models/mission.js')
const StudentModel = require('../models/student.js')
const AdminModel = require('../models/admin.js')
const MessageModel = require('../models/message.js')
const bcrypt = require('bcrypt-promise')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const bodyParser = require('body-parser')
const multer = require('multer')
const fs = require('fs')
const mail = require('./mail')

const hostUrl = process.env.HOST_URL || 'http://localhost:3000'
const jwtSecret = process.env.JWT_SECRET || 'MAKEITUNUVERSAL'
const LITTA_ADMIN_EMAIL = process.env.LITTA_ADMIN_EMAIL || 'admin@litta.fr'



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'tmp/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 10 ** 6 }, // 5mo
  fileFilter: function (req, file, cb) {
    if (!file.originalname.toLowerCase().match(/\.(pdf|jpeg|jpg|doc|docx|odt)$/)) {
      return cb(Error('.pdf, .doc/docx, .odt, .jpg/jpeg uniquement'))
    }
    cb(null, true)
  }

})

// create the multer instance that will be used to upload/save the file

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))



// Upload  de fichier by lawyer
router.post('/upload', upload.single('selectedFile'), async (req, res) => {
  const newFile = new FileModel()
  let newFileId = ''
  newFile.file.data = fs.readFileSync(req.file.path)
  newFile.file.contentType = req.file.mimetype
  newFile.file.name = req.file.filename
  newFile.save(async (err, file) => {
    newFileId = await file._id
    res.send({ result: 'ok', fileId: newFileId })
  })
})



// Handle any other errors
router.use(function (err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.send({ result: 'fail', error: { code: 1001, message: 'File is too big' } })
    return
  }

  next(err)
})

// GET FILE FROM DB
router.post('/download', async (req, res, next) => {
  FileModel.findOne({ _id: req.body.id}, (err, file) => {
    res.set('Content-Type', file.file.contentType)
    res.send(file.file)
  })
})


// DELETE ONE FILE
router.delete('/delete/:fileId', (req, res, next) => {
  const fileId = req.params.fileId
  FileModel
    .findByIdAndRemove(fileId)
    .then(async () => {
      const missions = await MissionModel.find()
      for (const mission of missions) {
        const missionToUpdate = { _id: mission.id}
        if (mission.filesFromLawyer.find(file => file.id === fileId) !== undefined) {
          const filesFromLawyerUpdated = mission.filesFromLawyer.filter(file => file.id !== fileId)
          await MissionModel.findOneAndUpdate(missionToUpdate, {filesFromLawyer: filesFromLawyerUpdated})
          res.end()
        }
        if (mission.filesFromStudent.find(file => file.id === fileId) !== undefined) {
          const filesFromStudentUpdated = mission.filesFromStudent.filter(file => file.id !== fileId)
          await MissionModel.findOneAndUpdate(missionToUpdate, {filesFromStudent: filesFromStudentUpdated})
          res.end()
        }
      }
    })
    .catch(next)
})

// POST Registration Admin

router.post('/signupadmin', async (req, res, next) => {
  const { user } = req.body
  const newAdmin = await new AdminModel(user)
  newAdmin.password = await bcrypt.hash(newAdmin.password, 16)

  newAdmin.save()
    .then(res.json('ok'))
    .then(async newuser => {
      const user = await AdminModel.findOne({ email: newuser.email })
      const link = `${hostUrl}/confirmationadmin/${user._id}`

      const options = {
        to: LITTA_ADMIN_EMAIL,
        ...mail.templates.ADMIN_ACCOUNT_CONFIRMATION(link)
      }

      return mail.send(options)
    })
    .catch(next)
})

// POST Registration Student

router.post('/regstudent', async (req, res, next) => {
  const { user } = req.body
  const newStudent = await new StudentModel(user)
  newStudent.password = await bcrypt.hash(newStudent.password, 16)

  newStudent.save()
    .then(res.json('ok'))
    .then(async newuser => {
      const user = await StudentModel.findOne({ email: newuser.email })
      const link = `${hostUrl}/confirmationstudent/${user._id}`

      const options = {
        to: `${user.email}`,
        subject: 'Confirmez votre adresse mail',
        ...mail.templates.STUDENT_ACCOUNT_CONFIRMATION(link)
      }

      return mail.send(options)
    })
    .catch(next)
})
// POST Registration Avocat


router.post('/reg', async (req, res, next) => {
  const { user } = req.body
  const newAvocat = await new AvocatModel(user)
  newAvocat.password = await bcrypt.hash(newAvocat.password, 16)

  newAvocat.save()
    .then(res.json('ok'))
    .then(async newuser => {
      const user = await AvocatModel.findOne({ email: newuser.email })
      const link = `${hostUrl}/confirmationlawyer/${user._id}`

      const options = {
        to: `${user.email}`,
        subject: 'Confirmez votre adresse mail',
        ...mail.templates.LAWYER_ACCOUNT_CONFIRMATION(link)
      }

      return mail.send(options)
    })
    .catch(next)
})

// Mail Confirm Get Admin
router.get('/confirmationadmin/:uuid', async (req, res) => {
  const query = await { _id: `${req.params.uuid}` }
  await AdminModel.findOneAndUpdate(query, { activated: true })
    .catch(err => { if (err) res.json('invalid user') })
  res.json('verified')
})

// Mail Confirm Get Advocat

router.get('/confirmationlawyer/:uuid', async (req, res) => {
  const query = await { _id: `${req.params.uuid}` }
  await AvocatModel.findOneAndUpdate(query, { activated: true })
    .catch(err => { if (err) res.json('invalid user') })
  res.json('verified')
})

// Mail Confirm Get Student

router.get('/confirmationstudent/:uuid', async (req, res) => {

  const query = await { _id: `${req.params.uuid}` }
  await StudentModel.findOneAndUpdate(query, { activated: true })
    .catch(err => { if (err) res.json('invalid user') })
  res.json('verified')

})

// POST Login admin

router.post('/loginadmin', async (req, res) => {
  const user = await AdminModel.findOne({ email: req.body.creds.email })
  if (user === null) {
    return res.json('auth failed')
  }
  if (user.activated === false) {
    return res.json('not verified')
  } else {
    const isEqual = await bcrypt.compare(req.body.creds.password, user.password)
    if (isEqual) {
      const token = jwt.sign({
        id: user._id,
        username: user.email
      }, jwtSecret)
      return res.json({ token })
    } else {
      return res.json('auth failed')
    }
  }
})

// POST Login Student / A VENIR

router.post('/loginstudent', async (req, res, next) => {
  const user = await StudentModel.findOne({email: req.body.creds.email})
  if (user === null) {
    return res.json('auth failed')
 }
 if (user.activated === false) {
   return res.json('not verified')
 } 
 if (user.approved === false) {
  return res.json('not approved')
} else {
   const isEqual = await bcrypt.compare(req.body.creds.password, user.password)
   if (isEqual) {
     const token = jwt.sign({
       id: user._id,
       username: user.email
     }, jwtSecret)
     return res.json({token})
   } else {
     return res.json('auth failed')
   }
 }
})

// POST Login avocat

router.post('/login', async (req, res, next) => {
  const user = await AvocatModel.findOne({ email: req.body.creds.email })
  if (user === null) {
    return res.json('auth failed')
  }
  if (user.approved === false) {
    return res.json('not approved')
  }
  if (user.activated === false) {
    return res.json('not verified')
  } else {
    const isEqual = await bcrypt.compare(req.body.creds.password, user.password)
    if (isEqual) {
      const token = jwt.sign({
        id: user._id,
        username: user.email
      }, jwtSecret)
      return res.json({ token })
    } else {
      return res.json('auth failed')
    }
  }
})

// Route to Auth?

router.get('/secure', (req, res, next) => {
  const token = req
    .headers
    .authorization
    .split(' ')[1]
  jwt.verify(token, jwtSecret, function (err, decoded) {
    console.log('Token verified')
    if (err) {
      console.log(err)
      res.json('notlogged')
    } else if (err === null) {
      console.log(true)
      res.json('logged')
    }
  })
})

// POST to get info admin

router.post('/infoadmin', async (req, res, next) => {
  const user = await AdminModel.findOne({ _id: req.body.decoded.id })
  res.json(user)
})

// EDIT ADMIN INFO
router.put('/infoadmin', async (req, res, next) => {
  const update = req.body.user

  if (update.password && update.password !== '') {
    update.password = await bcrypt.hash(update.password, 16)

    AdminModel.findByIdAndUpdate({
      _id: update.id
    }, { $set: update }).then((admin) => res.json(admin)).catch(next)
  } else {
    AdminModel.findByIdAndUpdate({
      _id: update.id
    }, {
        $set: {
          email: update.email,
          firstName: update.firstName,
          lastName: update.lastName
        }
      })
      .then(admin => res.json(admin))
      .catch(next)
  }
})

// POST to get info avocat

router.post('/infolawyer', async (req, res, next) => {
  const user = await AvocatModel.findOne({ _id: req.body.decoded.id })
  res.json(user)
})

// EDIT LAWYER INFO
router.put('/infolawyer', async (req, res, next) => {
  const update = req.body.user

  if (update.password && update.password !== '') {
    update.password = await bcrypt.hash(update.password, 16)

    AvocatModel.findByIdAndUpdate({
      _id: update.id
    }, { $set: update }).then((lawyer) => res.json(lawyer)).catch(next)
  } else {
    AvocatModel.findByIdAndUpdate({
      _id: update.id
    }, {
        $set: {
          email: update.email,
          firstName: update.firstName,
          lastName: update.lastName,
          cabinet: update.cabinet,
          phone: update.phone,
          address: update.address,
          city: update.city,
          zipCode: update.zipCode,
          toque: update.toque,
          field: update.field
        }
      })
      .then(lawyer => res.json(lawyer))
      .catch(next)
  }
})

// POST to get student info
router.post('/infostudent', async (req, res, next) => {
  await StudentModel.findOne({ _id: req.body.decoded.id })
    .then(student => {
      res.json(student)})
    .catch(next)
})

router.post('/studentfirstname', async (req, res, next) => {
  await StudentModel.findOne({ _id: req.body.id })
    .then(student => res.json(student.firstName))
    .catch(next)
})

// EDIT STUDENT INFO
router.put('/infostudent', async (req, res, next) => {
  const update = req.body.user

  if (update.password && update.password !== '') {
    update.password = await bcrypt.hash(update.password, 16)

    StudentModel.findByIdAndUpdate({
      _id: update.id
    }, { $set: update }).then((student) => res.json(student)).catch(next)
  } else {
    StudentModel.findByIdAndUpdate({
      _id: update.id
    }, {
        $set: {
          email: update.email,
          firstName: update.firstName,
          lastName: update.lastName,
          phone: update.phone,
          levelStudy: update.levelStudy,
          field: update.field
        }
      })
      .then(student => res.json(student))
      .catch(next)
  }
})


const sendNewMissionProposalToStudent = (student, mission) => {
  const link = `${hostUrl}/accept/${mission._id}/${student._id}`

  const options = {
    to: student.email,
    ...mail.templates.STUDENT_MISSION_WITH_LINK_PROPOSAL(mission, link)
  }

  return mail.send(options)
}

const sendNewMissionToAdmin = (mission) => {
  const options = {
    to: LITTA_ADMIN_EMAIL,
    ...mail.templates.ADMIN_CONFIRMATION_NEW_MISSION(mission)
  }

  return mail.send(options)
}

// Create mission
router.post('/missions', function (req, res, next) {
  const { mission } = req.body
  const newMission = new MissionModel(mission)

  newMission
    .save()
    .then(() => res.json(newMission))
    .then(async () => {
      const students = await StudentModel.find()
      const concernedStudents = students.filter(student => (student.field === mission.field) && (student.approved === true) && (student.activated === true))

      console.log(`Number of potential students: ${concernedStudents.length}`)

      concernedStudents
        .map(student => sendNewMissionProposalToStudent(student, newMission))

      sendNewMissionToAdmin(newMission)
    })
    .catch(next)
})

// GET Accept Mission

router.get('/accept/:mission/:uuid', async (req, res) => {
  const queryStudent = await { _id: `${req.params.uuid}` }
  const queryMission = await { _id: `${req.params.mission}` }
  await MissionModel.find(queryMission, async (err, result) => {
    if (result[0].student === null) {
      await MissionModel.findOneAndUpdate(queryMission, { student: queryStudent })
      await StudentModel.findOneAndUpdate(queryStudent, { $push: { missions: queryMission } })
      res.send('Attributed')
    } else {
      res.send('Not avalaible')
    }
  })
})

// Read missions
router.post('/missionsfiltered', (req, res, next) => {
  const lawyer = req.body.lawyerId
  MissionModel
    .find()
    .then(missions => res.json(missions.filter(mission => mission.finished === false).filter(mission => mission.author === lawyer)))
    .catch(next)
})

// GET ALL MISSIONS ADMIN PART

router.get('/allmissions', (req, res, next) => {
  MissionModel
    .find()
    .then(missions => res.json(missions))
    .catch(next)
})

// GET ONE CURRENT MISSION - Admin Part
router.get('/admin/missions/:missionId', (req, res, next) => {
  MissionModel
    .findById(req.params.missionId)
    .then(async (mission) => {
      const missionWithAdditionalDetails = { ...mission.toObject(), }

      const authorDatas = await AvocatModel.findById(mission.author)
      missionWithAdditionalDetails.cabinet = authorDatas.cabinet

      if (mission.student) {
        const studentDatas = await StudentModel.findById(mission.student)
        missionWithAdditionalDetails.studentFirstName = studentDatas.firstName
      } else {
        missionWithAdditionalDetails.studentFirstName = null
      }

     return res.json(missionWithAdditionalDetails)
    })
    .catch(next)
})

// GET ONE CURRENT MISSION
router.get('/missions/:missionId', (req, res, next) => {
  MissionModel
    .findById(req.params.missionId)
    .then(mission => res.json(mission))
    .catch(next)
})

// EDIT ONE MISSION WITH FILES SENDED NAMES
router.put('/missions/:missionId', (req, res, next) => {

  const fileId = req.body.fileId
  const fileName = req.body.fileName
  const userType = req.body.userType

  const pushFileSendedInfos = (type, name, id) => {
    if (type === 'lawyer') {
      return  { $push: { filesFromLawyer: {name, id} }}
    } else if (type === 'student') {
      return { $push: { filesFromStudent: {name, id} }}
    }
  }

  MissionModel
    .findByIdAndUpdate(req.params.missionId, pushFileSendedInfos(userType, fileName, fileId))
    .then(() => {
      res.end()
    })
    .catch(next)
})

// SEND MESSAGE TO STUDENT
router.post('/missions/sendmessage', async (req, res, next) => {
  const { message } = req.body
  const newMessage = new MessageModel(message)

  newMessage
    .save()
    .then(message =>{ 
      res.json(message)
    })
    .catch(next)

  // const messageContent = req.body.messageContent
  // const missionId = messageContent.missionId.slice(-5)

  // StudentModel.findOne({ _id: messageContent.studentId })
  //   .then(student => {
  //     const options = {
  //       to: LITTA_ADMIN_EMAIL,
  //       ...mail.templates.LAWYER_MESSAGE_TO_STUDENT(missionId, student, messageContent)
  //     }

  //     return mail.send(options)
  //   })
  //   .then(res.json("ok"))
  //   .catch(next)
})

// GET MESSAGES ON MISSION PAGE

router.get('/missions/:missionId/messages', (req, res, next) => {
  const missionId = req.params.missionId
  MessageModel
    .find()
    .then(messages => {
      return messages.filter(message => message.missionId === missionId)})
    .then(messagesByMissionId => {
      res.json(messagesByMissionId)})
    .catch(next)
})

// SEND MESSAGE TO LAWYER
router.post('/missions/:missionId/sendmessagetolawyer', async (req, res, next) => {
  const messageContent = req.body.messageContent
  const missionId = messageContent.missionId.slice(-5)

  AvocatModel.findOne({ _id: messageContent.lawyerId })
    .then(lawyer => {
      const options = {
        to: LITTA_ADMIN_EMAIL,
        ...mail.templates.STUDENT_MESSAGE_TO_LAWYER(missionId, lawyer, messageContent)
      }

      return mail.send(options)
    })
    .then(res.json("ok"))
    .catch(next)
})

// CHANGE STATUS OF MISSION TO FINISHED

router.put('/missions/:missionId/status', (req, res, next) => {

  const status = req.body

  MissionModel
    .findByIdAndUpdate(req.params.missionId, { $set: status })
    .then((changedStatus) => res.json(changedStatus))
    .catch(next)
})

// DELETE ONE MISSION
router.delete('/missions/:missionId', (req, res, next) => {
  MissionModel
    .findByIdAndRemove(req.params.missionId)
    .then(() => res.json('ok'))
    .catch(next)
})

// GET OLD MISSIONS

router.post('/oldmissionsfiltered', (req, res, next) => {
  const lawyer = req.body.lawyerId
  MissionModel
    .find()
    .then(missions =>
      missions.filter(mission => mission.finished === true)
        .filter(mission => mission.author === lawyer))
    .then(oldmissions => Promise.all(
      oldmissions.map(async mission => {
        let studentFirstName = ''
        await StudentModel
          .findById({ _id: mission.student })
          .then(id => {
            studentFirstName = id.firstName
          })
        const oldmission = {
          ...mission.toObject(),
          studentName: studentFirstName
        }
        return oldmission
      })
    )
  )
  .then(oldmissions => res.json(oldmissions))
  .catch(next)
})

// GET OLD MISSIONS - STUDENT PART

router.post('/student/oldmissionsfiltered', (req, res, next) => {
  const student = req.body.studentId
  MissionModel
    .find()
    .then(missions =>
      missions.filter(mission => mission.finished === true)
        .filter(mission => mission.student === student))
    .then(oldmissions => Promise.all(
      oldmissions.map(async mission => {
        let lawyerCabinetName = ''
        await AvocatModel
          .findById({ _id: mission.author })
          .then(id => {
            lawyerCabinetName = id.cabinet
          })
        const oldmission = {
          ...mission.toObject(),
          cabinet: lawyerCabinetName
        }
        return oldmission
      })
    )
  )
  .then(oldmissions => res.json(oldmissions))
  .catch(next)
})

// REPORT PROBLEM TO ADMIN
router.post('/missions/:missionId/reportproblem', async (req, res, next) => {
  const messageContent = req.body.messageContent
  const missionId = messageContent.missionId.slice(-5)

  if (messageContent.type === 'student_about_lawyer') {
    AvocatModel.findOne({ _id: req.body.messageContent.lawyerId })
    .then(lawyer => {
      const options = {
        to: LITTA_ADMIN_EMAIL,
        ...mail.templates.STUDENT_REPORT_PROBLEM_TO_ADMIN(missionId, lawyer, messageContent)
      }
      
      return mail.send(options)
    })
    .then(res.json("ok"))
    .catch(next)
  }
  if (messageContent.type === 'lawyer_about_student') {
    StudentModel.findOne({ _id: req.body.messageContent.studentId })
    .then(student => {
      const options = {
        to: LITTA_ADMIN_EMAIL,
        ...mail.templates.LAWYER_REPORT_PROBLEM_TO_ADMIN(missionId, student, messageContent)
      }
      
      return mail.send(options)
    })
    .then(res.json("ok"))
    .catch(next)
  }
})


// GET ALL LAWYERS

router.get('/alllawyers', (req, res, next) => {
  AvocatModel
    .find()
    .then(users => res.json(users))
    .catch(next)
})

// GET ONE LAWYER

router.get('/getLawyerInfos/:lawyerId', (req, res, next) => {
  const lawyerId = req.params.lawyerId
  AvocatModel
    .findById({ _id: lawyerId })
    .then(user => res.json({cabinet: user.cabinet}))
    .catch(next)
})

// CHANGE STATUS OF A LAWYER

router.post('/alllawyers', async (req, res, next) => {
  const update = req.body.user
  await AvocatModel.findByIdAndUpdate(update._id,
    { $set: update })
    .then((user) => res.json(user))
    .catch(next)
})

// DELETE ONE LAWYER
router.delete('/alllawyers/:lawyerId', (req, res, next) => {
  AvocatModel
    .findByIdAndRemove(req.params.lawyerId)
    .then(() => res.json('ok'))
    .catch(next)
})

// GET ALL STUDENTS

router.get('/allstudents', (req, res, next) => {
  StudentModel
    .find()
    .then(users => res.json(users))
    .catch(next)
})

// CHANGE STATUS OF A STUDENT

router.post('/allstudents', async (req, res, next) => {
  const update = req.body.user
  await StudentModel.findByIdAndUpdate(update._id,
    { $set: update })
    .then((user) => res.json(user))
    .catch(next)
})


// DELETE ONE STUDENT
router.delete('/allstudents/:studentId', (req, res, next) => {
  StudentModel
    .findByIdAndRemove(req.params.studentId)
    .then(() => res.json('ok'))
    .catch(next)
})

// GET MISSIONS BY STUDENT ID

router.post('/student/missionsfiltered', (req, res, next) => {
  const student = req.body.studentId
  MissionModel
    .find()
    .then(missions => res.json(missions.filter(mission => mission.finished === false).filter(mission => mission.student === student)))
    .catch(next)
})

module.exports = router
