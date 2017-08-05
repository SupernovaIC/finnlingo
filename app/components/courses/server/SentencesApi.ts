class SentencesApi {
    @Decorators.publish
    static subscribeToSentences(lessonId): Mongo.Cursor<Sentence> {
        var user = ACL.getUserOrThrow(this);
        return Sentences.find({ lessonId: lessonId });
    }

    @Decorators.method
    static addSentence(text: string, lessonId: string, callback?) {
        var user = ACL.getUserOrThrow(this);
        
        Sentences.insert({
            text: text,
            translations: [],
            backTranslations: [],
            lessonId: lessonId,
            order: Sentences.find({ lessonId: lessonId }).count(),
            wordHints: SentencesApi.generateWordHints(text)
        });
    }

    @Decorators.method
    static updateSentence(sentenceModel: Sentence, callback?) {
        var user = ACL.getUserOrThrow(this);
        Sentences.update(
            { _id: sentenceModel._id }, 
            { $set: { 
                text: sentenceModel.text,
                translations: sentenceModel.translations,
                backTranslations: sentenceModel.backTranslations,
                order: sentenceModel.order,
                wordHints: SentencesApi.generateWordHints(sentenceModel.text)
            } }
        );
    }

    static generateWordHints(text: string) {
        let wordHints = {};
        for (let word of Utilities.sentenceToWords(text)) {
            let wordObj = Words.findOne({ $or: [{ text: word }, { "inflections.text": word }]});
            let html = '';
            if (wordObj) {
                let inflection = wordObj.inflections.filter(i => i.text == word)[0];
                wordHints[word] = { wordId: wordObj._id, translations: inflection ? [ inflection.remarks ] : wordObj.translations.map(t => t.text) };
            }
        }
        return wordHints;
    }

    // this is a very heavy operation
    // probably need to rewrite later
    static refreshWordHints(word) {
        var sentences = Sentences.find({ text: new RegExp(word.replace(/[^a-zäö]/g,''), 'i') }, { fields: { text: 1 } }).fetch();
        for (var sentence of sentences) {
            Sentences.update(
                { _id: sentence._id }, 
                { $set: { 
                    wordHints: SentencesApi.generateWordHints(sentence.text)
                } }
            );
        }
    }

    @Decorators.method
    static removeSentence(sentence, callback?) {
        var user = ACL.getUserOrThrow(this);
        Sentences.remove(
            { _id: sentence._id }
        );
    }

}
this.SentencesApi = SentencesApi;