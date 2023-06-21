const ContentBasedRecommender = require('content-based-recommender')
const recommender = new ContentBasedRecommender({
  minScore: 0.1,
  maxSimilarDocuments: 100
});

// prepare documents data
const documents = [
  { id: '1000001', 
    content: "My uncle was murdered in front of my eyes, it was traumatizing and painful"
  },
  { id: '1000002', 
    content: "I am finally happy, all of that pain is gone"
  },
  { id: '1000003', 
    content: "The time when I needed them the most, no one was there"
  },
  { id: '1000004', 
    content: "I tried to attempt suicide 3 times, depression cannot be healed it seems"
  },
  { id: '1000005', 
    content: "I was suffering from Post traumatic stress disorder,after I was saved from drowning "
  },
  { id: '1000006', 
    content: "Is suicide really a solution?" 
  },
  { id: '1000007', 
    content: "How Python almost killed me?"
  },
  { id: '1000008', 
    content: "I already lost my family, I can't lose anyone else now" 
  },
  { id: '1000009', 
    content: "Why does all bad things happen to me?"
  },
  { id: '1000010',   
    content: "Recently I had an accident which led to injure my right hand"
  },
  {
    id: '1000011',
    content: "I lost my Grandpa this year, it was horrifying and very painful to get over it."
  },
  {
    id: '1000012',
    content: "I saw my family die in a car accident, if was scary and painful"
  },
  {
    id: '1000013',
    content: "I was traumatized after the match when I lost for the first time in my life"
  },
];

recommender.train(documents);

const similarDocuments = recommender.getSimilarDocuments('1000001', 0, 10);

console.log(similarDocuments);
