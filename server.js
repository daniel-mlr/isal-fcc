'use strict'
// dependencies
require('dotenv').config()
const express = require('express')
const app = express();
const mongoose = require('mongoose')
const Bing = require('node-bing-api')({
    accKey: process.env.BING_ACCKEY2, 
    rootUri: 'https://api.cognitive.microsoft.com/bing/v7.0/'
})
const searchTerm = require('./models/searchmodel.js')


const connectURI = process.env.MONGODB_URI || 'mongodb://localhost/searchTerms' 
mongoose.Promise = global.Promise; // to remove deprecation warning
mongoose.connect(connectURI, {useMongoClient: true}).then(
        () => { console.log('mongoose connected successfully') },
        (err) => {throw new Error(err + '=== mongoose failed to connect')})


// catch malformed uri parameters (why doesn't express take care of that?)
// no path specified, then the function is executed on every request.
app.use(function(req, res, next) {
    var err = null;
    try { decodeURIComponent(req.path) }
    catch(e) { err = e; }
    if (err){
        console.log('erreur décodage', err, req.url);
        return res.status(400).end('400 - bad request')}
    next();
});


// home page
app.get('/', (req, res) => {
    res.send('to do: front page')
})

// get the most recent search
var count_recent = 10;
app.get(['/api/latest/imgsearch', '/api/latest/imagesearch'], (req, res) => {
    searchTerm.find({}, {search_val:1 })
        .sort({_id:-1})
        .limit(count_recent)
        .exec( (err, data) => {
            if (err) return console.error('erreur dans searchTerm.find ' + err);
           
            // When defining a virtual field in the model ('when'), it comes
            // with its own id field, which is a copy of the corresponding _id
            // field.  This _id field also appear in the results despite the
            // fact that I specified only one field, '{search_val: 1}', to
            // appear in the result.  Why is it so?
            //
            // Also, how to rename 'search_val' to 'term' in the result?
            //
            // More, according to express.js reference, res.json([body]) uses
            // JSON.stringify to transform [body]. So why 
            // res.json(data, ['search_val', 'when']) doesn't work?
            
            res.send(JSON.stringify(data, ['search_val', 'when']))
        })
})

// Get call for an image search
app.get('/api/imgsearch/:search_val*', (req, res, next) => {
    
    var { search_val } = req.params;
    var { offset, count, market } = req.query;
    
    var data = new searchTerm({
        search_val 
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

    // search on Bing
    Bing.images(search_val, search_params, (error, response, body) => {
        
        // check if enough matches are returned to satisfy offset and count
        var { totalEstimatedMatches } = body;
        var distFromStart = search_val.count + search_val.offset;
        if (totalEstimatedMatches < distFromStart) {
            res.json(['not enough matches'])
        }

        // prepare and display the search results
        // (there must be a better way to achieve this)
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
})


// display instructions if no query string are provided
app.get(['/api/imgsearch', '/api/imagesearch/*'], (req, res) => {
    res.json({
        'usage': req.hostname + '/api/imgsearch/<your search terms>?offset=<offset>&count=<count per page>'
    })
})


// get the most frequent search (extra feature)
app.get([ '/api/top/imgsearch', '/api/top/imagesearch' ], (req, res) => {
    // search most used, todo
})


// all other routes are directed here
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
