// requirements
const mongoose = require('mongoose')
const Schema = mongoose.Schema

// model
const searchtermSchema = new Schema({ 
    search_val: {type: String, required: true}
}, {
    toObject: {virtuals: true},
    toJSON: {virtuals: true}
})

// virtual properties
searchtermSchema.virtual('when').get(function() {
    return this._id.getTimestamp()
})

// query helpers
//

// static methods
// searchtermSchema.statics.findRecentTerms = function(count, callbk) {
//     return this.find({}, {search_val:1})
// }

// connect model and collection
const ModelClass = mongoose.model('searchTerm', searchtermSchema)

module.exports = ModelClass;
