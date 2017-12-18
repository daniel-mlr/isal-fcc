'use strict'
// dependencies
require('dotenv').config()
const express = require('express')
const app = express();
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const Bing = require('node-bing-api')({
    accKey: process.env.BING_ACCKEY2, 
    rootUri: 'https://api.cognitive.microsoft.com/bing/v7.0/'
})
const searchTerm = require('./models/searchmodel.js')

app.use(bodyParser.json())

const connectURI = process.env.MONGODB_URI || 'mongodb://localhost/searchTerms' 
mongoose.Promise = global.Promise; // to remove deprecation warning
mongoose.connect(connectURI, {useMongoClient: true})

// catch malformed uri parameters (why doesn't express take care of that?)
// no path specified, then the function is executed on every request.
app.use(function(req, res, next) {
    var err = null;
    try {
        decodeURIComponent(req.path)
    }
    catch(e) {
        err = e;
    }
    if (err){
        console.log('erreur décodage', err, req.url);
        return res.status(400).end('400 - bad request')}
    next();
});

app.get('/', (req, res) => {
    res.send('to do: front page')
})

// get the most recent search
app.get([ '/api/latest/imgsearch', '/api/latest/imagesearch' ], (req, res) => {

    var query = searchTerm.find({}, {search_val:1}).sort({_id:-1}).limit(3);
    query.exec( (err, data) => {
        if (err) return console.error('erreur dans searchTerm.find ' + err);

        var results = [];
        for (var i=0; i<3; i++) {
            results.push({
                'term': data[i].search_val, 
                'when': data[i]._id.getTimestamp()
            })
        }
        res.json(results)
    })
})

// Get call for an image
app.get('/api/imgsearch/:search_val*', (req, res, next) => {
    
    var { search_val } = req.params;
    var { offset, count, market } = req.query;
    
    var data = new searchTerm({
        search_val 
        // search_date: new Date()
    })

    // basic parameters validations 
    var search_params = {};
    search_params.offset = validateNumber(offset, 0);
    search_params.count = validateNumber(count, 10);
    
    // save the search in db
    data.save(err => {
        if (err) { console.log('erreur de sauvegarde dans la BD: ' + err) }
        console.log('saving ' + search_val)
    })

    // res.json(search_params)
    console.log('search_params: ' + JSON.stringify(search_params))
    // next()

    // Bing.images(search_val, {count:3, offset:0}, (error, response, body) => {
    Bing.images(search_val, search_params, (error, response, body) => {
       
        var { totalEstimatedMatches } = body;
        var distFromStart = search_val.count + search_val.offset;
       
        if (totalEstimatedMatches < distFromStart) {
            // not enough matches
            res.json(['not enough matches'])
        }
        console.log('total est. matches: ' + totalEstimatedMatches)

        var results = [];
        for (var i=0; i < search_params.count; i++) {
            results.push({
                'url': body.value[i].contentUrl,
                'snippte': body.value[i].name,
                'thumbnail': body.value[i].thumbnailUrl,
                'context': body.value[i].hostPageUrl
            })
        }
        res.json(results)
        // res.json(body)
    })
    /*
    */
})


app.get(['/api/imgsearch', '/api/imagesearch/*'], (req, res) => {
    res.json({
        'usage': req.hostname + '/api/imgsearch/<your search terms>?offset=<offset>&count=<count per page>'
    })
})


// get the most frequent search
app.get([ '/api/top/imgsearch', '/api/top/imagesearch' ], (req, res) => {
    // search most used, todo
})

// all other routes
app.get('*', (req, res) => {res.status(404).end('404 - page not found')})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`server listening on port ${PORT}`))

// validation functions
function validateNumber(str, default_val) {
    if (isNaN(str) ) {
        return default_val
    }
    return parseInt(str)
}
function validateMarket(str, default_val) {
    // à faire: tester validation par node-bing-api, ainsi que la possibilité
    // de spécifier plusieurs codes par une liste séparée par virgule
}
