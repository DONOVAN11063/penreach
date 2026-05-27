const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    phase: {
        type: String,
        required: true,
        enum: ['Foundation', 'Intermediate', 'Senior', 'FET'],
        default: 'Foundation'
    },
    grade: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grade',
        required: false
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: false
    },
    term: {
        type: Number,
        required: true,
        enum: [1, 2, 3, 4],
        default: 1
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    targetAudience: { 
        type: String, 
        required: true, 
        enum: ['student', 'teacher'],
        default: 'student'
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate topics
topicSchema.index({ name: 1, phase: 1, grade: 1, subject: 1, term: 1 }, { unique: true });

// Index for better query performance
topicSchema.index({ phase: 1, grade: 1, subject: 1 });
topicSchema.index({ grade: 1, subject: 1 });
topicSchema.index({ term: 1 });

// Virtual for display name
topicSchema.virtual('displayName').get(function() {
    return `${this.name} (Term ${this.term})`;
});

module.exports = mongoose.model('Topic', topicSchema);
