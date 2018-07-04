const express = require('express')
const router = express.Router()
const AvocatModel = require('../models/avocat.js')
const MissionModel = require('../models/mission.js')
const StudentModel = require('../models/student.js')
const bcrypt = require('bcrypt-promise')
const jwt = require('jsonwebtoken')
const jwtSecret = 'MAKEITUNUVERSAL'
const nodemailer = require('nodemailer')
const bodyParser = require('body-parser')
const multer = require('multer')

// const path = require('path') Generate test SMTP service account from
// ethereal.email Only needed if you don't have a real mail account for testing
// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'vbkawgch3kkkhqax@ethereal.email',
        pass: 'bVWMcjVnQenkaJsGz4'
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'tmp/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
})

const upload = multer({storage: storage})

// create the multer instance that will be used to upload/save the file

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({extended: true}))

// Upload  de fichier
router.post('/upload', upload.single('selectedFile'), (req, res) => {

    res.json('sucess')

})

// POST Registration Student

router.post('/regstudent', async(req, res, next) => {

    const newStudent = await new StudentModel(req.body.user)
    newStudent.password = await bcrypt.hash(newStudent.password, 16)

    await newStudent
        .save()
        .then(res.json('ok'))
        .then(async() => {
            const user = await StudentModel.findOne({email: req.body.user.email})
            let link = await `http://localhost:3030/confirmation/student/${user._id}`

            // setup email data with unicode symbols
            let mailOptions = {
                from: 'tester@gmail.com', // sender address
                to: `${req.body.user.email}`, // list of receivers
                subject: 'Confirmez votre adresse mail', // Subject line
                text: `Cheres Etudiant,

							Afin de validez votre inscription sur LITTA en attendant la validation d'un administrateur, merci de cliquer sur le lien suivant :

							${link}

							Merci,

							L’équipe de LITTA`
            };

            // send mail with defined transport object
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: %s', info.messageId);
                // Preview only available when sending through an Ethereal account
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            })
        })
        .catch(next)
})
// POST Registration Avocat

router.post('/reg', async(req, res, next) => {

    const newAvocat = await new AvocatModel(req.body.user)
    newAvocat.password = await bcrypt.hash(newAvocat.password, 16)

    await newAvocat
        .save()
        .then(res.json('ok'))
        .then(async() => {
            const user = await AvocatModel.findOne({email: req.body.user.email})
            // await AvocatModel.findByIdAndUpdate(user._id, {uuid: uuidv4()}) const user2 =
            // await AvocatModel.findOne({email: req.body.user.email})
            let link = await `http://localhost:3030/confirmation/${user._id}` // attention backend a changer -Dan

            // setup email data with unicode symbols
            let mailOptions = {
                from: 'tester@gmail.com', // sender address
                to: `${req.body.user.email}`, // list of receivers
                subject: 'Confirmez votre adresse mail', // Subject line
                text: `Maître,

                Afin de validez votre inscription sur LITTA, merci de cliquer sur le lien suivant :

                ${link}

                Merci,

                L’équipe de LITTA`
            };

            // send mail with defined transport object
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: %s', info.messageId);
                // Preview only available when sending through an Ethereal account
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            })
        })
        .catch(next)
})

// Mail Confirm Get Advocat
router.get('/confirmation/:uuid', async(req, res) => {

    console.log(req.params.uuid)
    const query = await {uuid: `${req.params.uuid}`}
    await AvocatModel.findOneAndUpdate(query, {activated: true})
    res.json('testing')
})

// Mail Confirm Get Student
router.get('/confirmation/:uuid', async(req, res) => {

    console.log(req.params.uuid)
    const query = await {uuid: `${req.params.uuid}`}
    await StudentModel.findOneAndUpdate(query, {activated: true})
    res.json('testing')
})

// POST Login Student

router.post('/loginStudent', async(req, res, next) => {
    const user = await StudentModel.findOne({email: req.body.creds.email})
    const isEqual = await bcrypt.compare(req.body.creds.password, user.password)
    if (isEqual === true) {
        const token = jwt.sign({
            id: user._id,
            username: user.email
        }, jwtSecret)
        res.json({token})
    } else {
        return next(Error('error'))
    }
})

// POST Login avocat

router.post('/login', async(req, res, next) => {
    const user = await AvocatModel.findOne({email: req.body.creds.email})
    console.log(user)
    if (user === null) {
        return res.json('error')
    }
    const isEqual = await bcrypt.compare(req.body.creds.password, user.password)
    if (isEqual) {
        const token = jwt.sign({
            id: user._id,
            username: user.email
        }, jwtSecret)
        res.json({token})
    } else {
        res.json('auth failed')
        return next(Error('Wrong Password'))
    }
})

// Route to Auth?

router.get('/secure', (req, res, next) => {
    const token = req
        .headers
        .authorization
        .split(' ')[1]
    jwt.verify(token, jwtSecret, function (err, decoded) {
        console.log('token verify')
        if (err) {
            console.log(err)
            res.json('notlogged')
        } else if (err === null) {
            console.log(true)
            res.json('logged')
        }
    })
})

// POST to get info avocat

router.post('/infolawyer', async(req, res, next) => {
    console.log(req.body.decoded.id)
    const user = await AvocatModel.findOne({_id: req.body.decoded.id})
    console.log(user)
    res.json(user)
})

// EDIT LAWYER INFO
router.put('/infolawyer', async(req, res, next) => {
    const update = req.body.user
    console.log(update)

    if (update.password && update.password !== '') {
        console.log('password modifié', update)
        update.password = await bcrypt.hash(update.password, 16)
        console.log('password modifié apres crypt', update)

        AvocatModel.findByIdAndUpdate({
            _id: update.id
        }, {$set: update}).then((lawyer) => res.json(lawyer)).catch(next)
    } else {
        console.log('password pas modifié', update)
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
            .then(lawyer => console.log(lawyer))
            .then(lawyer => res.json(lawyer))
            .catch(next)
    }
})

// Create mission
router.post('/missions', function (req, res, next) {
    const newMission = new MissionModel(req.body.mission)
    console.log(req.body.mission)
    newMission
        .save()
        .then(() => res.json(newMission))
        .then(() => {
            console.log('trigger')
            StudentModel
                .find()
                .then(async students => {
                    let emails = []
                    let ids = []
                    const studentList = students.filter(students => students.field === req.body.mission.field)
                    for (let key in studentList) {
                        if (studentList.hasOwnProperty(key)) {
                            emails.push(studentList[key].email)
                            ids.push(studentList[key]._id)
                        }
                    }
                    console.log(`Number of potential students: ${emails.length}`)
                    for (let i = 0; i < emails.length; i++) {
                        let link = `http://localhost:3030/accept/${newMission._id}/${ids[i]}`
                        // setup email data with unicode symbols
                        let mailOptions = {
                            from: 'tester@gmail.com', // sender address
                            to: `${emails[i]}`, // list of receivers
                            subject: 'Proposition de mission', // Subject line
                            text: `Bonjour,
			
															Une nouvelle mission est disponible en ${req.body.mission.field}
															La description de la mission est la suivante: 
															${req.body.mission.description}


															 //insérer un bouton//
															 ${link}
															Merci,
			
															L’équipe de LITTA`
                        }

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error)
                            }
                            console.log('Message sent: %s', info.messageId)
                            // Preview only available when sending through an Ethereal account
                            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
                        })
                    }

                })
                .catch(next)
        })
})

// GET Accept Mission

router.get('/accept/:mission/:uuid', async(req, res) => {
    const queryStudent = await {_id: `${req.params.uuid}`}
    const queryMission = await {_id: `${req.params.mission}`}
    await MissionModel.find(queryMission, async(err, result) => {
        if (result[0].student === '') {
            await MissionModel.findOneAndUpdate(queryMission, {student: queryStudent}),
            res.send('La mission vous a été attribuée')
        } else {
            res.send(`La mission n'est plus valable ou a été attribuée à un autre étudiant`)
        }
    });
})

// POST Upload file
router.post('/missions/:missionId', upload.single('selectedFile'), (req, res) => {
    res.send()
})

// Read missions
router.post('/missionsfiltered', (req, res, next) => {
    const lawyer = req.body.lawyerId
    MissionModel
        .find()
        .then(missions => res.json(missions.filter(mission => mission.finished === false).filter(mission => mission.author === lawyer)))
        .catch(next)
})

// GET ONE CURRENT MISSION
router.get('/missions/:missionId', (req, res, next) => {
    MissionModel
        .findById(req.params.missionId)
        .then(mission => res.json(mission))
        .catch(next)
})

// EDIT ONE MISSION
router.put('/missions/:missionId', (req, res, next) => {
    const update = req.body

    MissionModel
        .findByIdAndUpdate(req.params.missionId, {$set: update})
        .then((mission) => res.json(mission))
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
        .then(missions => res.json(missions.filter(mission => mission.finished === true).filter(mission => mission.author === lawyer)))
        .catch(next)
})

module.exports = router
