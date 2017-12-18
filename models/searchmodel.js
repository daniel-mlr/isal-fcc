// requirements
const mongoose = require('mongoose')
const Schema = mongoose.Schema

// model
const searchtermSchema = new Schema({
    search_val: String,
//     search_date: Date
}, {timestamp: true})

// connect model and collection
const ModelClass = mongoose.model('searchTerm', searchtermSchema)

module.exports = ModelClass;
