const _ = require('underscore');
const Vector = require('vector-object');
const striptags = require('striptags');
const sw = require('stopword');
const natural = require('natural');

const { TfIdf, PorterStemmer, NGrams } = natural;
const tokenizer = new natural.WordTokenizer();

const defaultOptions = {
  maxVectorSize: 100,
  maxSimilarDocuments: Number.MAX_SAFE_INTEGER,
  minScore: 0,
  debug: false,
};

class ContentBasedRecommender {
  constructor(options = {}) {
    this.setOptions(options);

    this.data = {};
  }

  setOptions(options = {}) {
    if ((options.maxVectorSize !== undefined) &&
      (!Number.isInteger(options.maxVectorSize) || options.maxVectorSize <= 0)) {
      throw new Error('The option maxVectorSize should be integer and greater than 0');
    }

    if ((options.maxSimilarDocuments !== undefined) &&
      (!Number.isInteger(options.maxSimilarDocuments) || options.maxSimilarDocuments <= 0)) {
      throw new Error('The option maxSimilarDocuments should be integer and greater than 0');
    }

    if ((options.minScore !== undefined) &&
      (!_.isNumber(options.minScore) || options.minScore < 0 || options.minScore > 1)) {
      throw new Error('The option minScore should be a number between 0 and 1');
    }

    this.options = Object.assign({}, defaultOptions, options);
  }

  train(documents) {
    this.validateDocuments(documents);

    if (this.options.debug) {
      console.log(`Total documents: ${documents.length}`);
    }

    const preprocessDocs = this._preprocessDocuments(documents, this.options);

    const docVectors = this._produceWordVectors(preprocessDocs, this.options);

    this.data = this._calculateSimilarities(docVectors, this.options);
  }

  validateDocuments(documents) {
    if (!_.isArray(documents)) {
      throw new Error('Documents should be an array of objects');
    }

    for (let i = 0; i < documents.length; i += 1) {
      const document = documents[i];

      if (!_.has(document, 'id') || !_.has(document, 'content')) {
        throw new Error('Documents should be have fields id and content');
      }

      if (_.has(document, 'tokens') || _.has(document, 'vector')) {
        throw new Error('"tokens" and "vector" properties are reserved and cannot be used as document properties"');
      }
    }
  }

  getSimilarDocuments(id, start = 0, size = undefined) {
    let similarDocuments = this.data[id];

    if (similarDocuments === undefined) {
      return [];
    }

    const end = (size !== undefined) ? start + size : undefined;
    similarDocuments = similarDocuments.slice(start, end);

    return similarDocuments;
  }

  export() {
    return {
      options: this.options,
      data: this.data,
    };
  }

  import(object) {
    const { options, data } = object;

    this.setOptions(options);
    this.data = data;
  }

  _preprocessDocuments(documents, options) {
    if (options.debug) {
      console.log('Preprocessing documents');
    }

    const processedDocuments = documents.map(item => {
      let tokens = this._getTokensFromString(item.content);
      return {
        id: item.id,
        tokens,
      };
    });

    return processedDocuments;
  }

  _getTokensFromString(string) {
    const tmpString = striptags(string, [], ' ')
      .toLowerCase();

    const tokens = tokenizer.tokenize(tmpString);

    const unigrams = sw.removeStopwords(tokens)
      .map(unigram => PorterStemmer.stem(unigram));

    const bigrams = NGrams.bigrams(tokens)
      .filter(bigram =>
        (bigram.length === sw.removeStopwords(bigram).length))
      .map(bigram =>
        bigram.map(token => PorterStemmer.stem(token))
          .join('_'));

    const trigrams = NGrams.trigrams(tokens)
      .filter(trigram =>
        (trigram.length === sw.removeStopwords(trigram).length))
      .map(trigram =>
        trigram.map(token => PorterStemmer.stem(token))
          .join('_'));

    return [].concat(unigrams, bigrams, trigrams);
  }

  _produceWordVectors(processedDocuments, options) {
    const tfidf = new TfIdf();

    processedDocuments.forEach((processedDocument) => {
      tfidf.addDocument(processedDocument.tokens);
    });

    const documentVectors = [];

    for (let i = 0; i < processedDocuments.length; i += 1) {
      if (options.debug) {
        console.log(`Creating word vector for document ${i}`);
      }

      const processedDocument = processedDocuments[i];
      const hash = {};

      const items = tfidf.listTerms(i);
      const maxSize = Math.min(options.maxVectorSize, items.length);
      for (let j = 0; j < maxSize; j += 1) {
        const item = items[j];
        hash[item.term] = item.tfidf;
      }

      const documentVector = {
        id: processedDocument.id,
        vector: new Vector(hash),
      };

      documentVectors.push(documentVector);
    }

    return documentVectors;
  }

  /**
   *
   *
   * @param documentVectors ex.: BlogPost
   * @param targetDocumentVectors ex.: Affiliate Product
   * @param options
   * @returns {{}}
   * @private
   */
  _calculateSimilaritiesBetweenTwoVectors(documentVectors, targetDocumentVectors, options) {
    const data = {
      ...this.initializeDataHash(documentVectors),
      ...this.initializeDataHash(targetDocumentVectors)
    };

    for (let i = 0; i < documentVectors.length; i += 1) {
      if (options.debug) console.log(`Calculating similarity score for document ${i}`);

      for (let j = 0; j < targetDocumentVectors.length; j += 1) {
        let documentVectorA = documentVectors[i];
        let targetDocumentVectorB = targetDocumentVectors[j];
        const idi = documentVectorA.id;
        const vi = documentVectorA.vector;
        const idj = targetDocumentVectorB.id;
        const vj = targetDocumentVectorB.vector;
        const similarity = vi.getCosineSimilarity(vj);

        if (similarity > options.minScore) {
          data[idi].push({
            id: targetDocumentVectorB.id,
            score: similarity
          });
          data[idj].push({
            id: documentVectorA.id,
            score: similarity
          });
        }
      }
    }

    this.orderDocuments(data, options);

    return data;
  }

  initializeDataHash(documentVectors) {
    return documentVectors.reduce((acc, item) => {
      acc[item.id] = [];
      return acc;
    }, {});
  }

  _calculateSimilarities(documentVectors, options) {
    const data = { ...this.initializeDataHash(documentVectors) };

    for (let i = 0; i < documentVectors.length; i += 1) {
      if (options.debug) console.log(`Calculating similarity score for document ${i}`);

      for (let j = 0; j < i; j += 1) {
        let documentVectorA = documentVectors[i];
        const idi = documentVectorA.id;
        const vi = documentVectorA.vector;
        let documentVectorB = documentVectors[j];
        const idj = documentVectorB.id;
        const vj = documentVectorB.vector;
        const similarity = vi.getCosineSimilarity(vj);

        if (similarity > options.minScore) {
          data[idi].push({
            id: documentVectorB.id,
            score: similarity
          });

          data[idj].push({
            id: documentVectorA.id,
            score: similarity
          });
        }
      }
    }

    this.orderDocuments(data, options);

    return data;
  }

  orderDocuments(data, options) {
    Object.keys(data)
      .forEach((id) => {
        data[id].sort((a, b) => b.score - a.score);

        if (data[id].length > options.maxSimilarDocuments) {
          data[id] = data[id].slice(0, options.maxSimilarDocuments);
        }
      });
  }
}

module.exports = ContentBasedRecommender;