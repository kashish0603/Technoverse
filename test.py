from abusive_lang import predict, predict_prob

text_0 = "this is simple review still you were so bad with it"
print(predict(text_0))
print(predict_prob(text_0))

text_1 = "son of a bitch"
print(predict(text_1))
print(predict_prob(text_1))

test = ['I love you' , 'what do you want pussy?' , 'son of a dog' , 'shut up' , 'fuck it']
print(predict(test))
print(predict_prob(test))
