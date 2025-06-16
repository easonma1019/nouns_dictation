import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Grid,
  ButtonGroup
} from '@mui/material';
import axios from 'axios';
import LoopIcon from '@mui/icons-material/Loop';

const API_BASE_URL = 'http://localhost:5050/api';

function App() {
  const [sentence, setSentence] = useState('');
  const [nounCount, setNounCount] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [errorCount, setErrorCount] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [correctNouns, setCorrectNouns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [inputStatus, setInputStatus] = useState([]);
  const [isLoop, setIsLoop] = useState(false);
  const [allTitles, setAllTitles] = useState([]);
  const [listenedTitles, setListenedTitles] = useState([]);
  const audioRef = useRef(null);
  const [completedTitles, setCompletedTitles] = useState({});
  const inputRefs = useRef([]);
  const [emptyWarning, setEmptyWarning] = useState(false);
  const [showSentence, setShowSentence] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [testGroups, setTestGroups] = useState(["all"]);
  const [selectedTest, setSelectedTest] = useState("all");
  const [autoPlayCount, setAutoPlayCount] = useState(0);
  const [cambridgeGroups, setCambridgeGroups] = useState([]);
  const [selectedCambridge, setSelectedCambridge] = useState('all');
  const [testsByCambridge, setTestsByCambridge] = useState({});

  // Fetch all titles for the right panel
  useEffect(() => {
    axios.get(`${API_BASE_URL}/all-titles`).then(res => {
      setAllTitles(res.data.titles);
      setCambridgeGroups(res.data.cambridge_groups || []);
      setTestsByCambridge(res.data.tests_by_cambridge || {});
      setTestGroups(res.data.tests_by_cambridge?.[res.data.cambridge_groups?.[0] || 'all'] || []);
      setSelectedCambridge(res.data.cambridge_groups?.[0] || 'all');
      setSelectedTest(res.data.tests_by_cambridge?.[res.data.cambridge_groups?.[0] || 'all']?.[0] || 'all');
    });
  }, []);

  // Mark title as listened
  useEffect(() => {
    if (title && !listenedTitles.includes(title)) {
      setListenedTitles(prev => [...prev, title]);
    }
  }, [title]);

  const fetchNewSentence = async () => {
    try {
      setLoading(true);
      // 过滤未完成的 title
      const unfinishedTitles = allTitles.filter(t => !(completedTitles[t.title] >= 2));
      if (unfinishedTitles.length === 0) {
        setMessage('Congratulations, all sentences are completed!');
        setLoading(false);
        return;
      }
      // 随机选一个未完成的 title
      const randomTitle = unfinishedTitles[Math.floor(Math.random() * unfinishedTitles.length)];
      const response = await axios.get(`${API_BASE_URL}/get-sentence-by-title`, { params: { title: randomTitle.title } });
      setSentence(response.data.sentence);
      setNounCount(response.data.noun_count);
      setAnswers(new Array(response.data.noun_count).fill(''));
      setErrorCount(0);
      setShowCorrect(false);
      setCorrectNouns([]);
      setMessage('');
      setTitle(response.data.title || '');
      setInputStatus([]);
      setShowSentence(false);
      setAudioSpeed(1.0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 300);
    } catch (error) {
      console.error('Error fetching sentence:', error);
      setMessage('Error fetching sentence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Jump to a specific title
  const jumpToTitle = async (jumpTitle) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/get-sentence-by-title`, { params: { title: jumpTitle } });
      setSentence(res.data.sentence);
      setNounCount(res.data.noun_count);
      setAnswers(new Array(res.data.noun_count).fill(''));
      setErrorCount(0);
      setShowCorrect(false);
      setCorrectNouns([]);
      setMessage('');
      setTitle(res.data.title || '');
      setInputStatus([]);
      setShowSentence(false);
      setAudioSpeed(1.0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 300);
    } catch (e) {
      setMessage('Error loading sentence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewSentence();
  }, []);

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      if (answers.some(ans => !ans.trim())) {
        setMessage('Please fill in all blanks before submitting.');
        setEmptyWarning(true);
        e.preventDefault(); // 阻止表单默认提交
        return;
      }
      setEmptyWarning(false);
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (answers.some(answer => !answer.trim())) {
      setMessage('Please fill in all blanks before submitting.');
      setEmptyWarning(true);
      return;
    }
    setEmptyWarning(false);

    try {
      const response = await axios.post(`${API_BASE_URL}/check-answers`, {
        sentence,
        answers
      });

      const correct = response.data.correct_nouns.map(noun => noun.toLowerCase());
      const status = answers.map(ans => correct.includes(ans.trim().toLowerCase()));
      setInputStatus(status);

      if (response.data.is_correct) {
        setCompletedTitles(prev => {
          const count = (prev[title] || 0) + 1;
          return { ...prev, [title]: count };
        });
        setMessage('Correct! Moving to next sentence...');
        setTimeout(fetchNewSentence, 1500);
      } else {
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);
        if (newErrorCount >= 3) {
          setShowSentence(true);
        }
        if (newErrorCount >= 5) {
          setShowCorrect(true);
          setCorrectNouns(response.data.correct_nouns);
          setMessage('Maximum attempts reached. Here are the correct answers.');
        } else {
          setMessage(`Incorrect. You have ${5 - newErrorCount} attempts remaining.`);
        }
      }
    } catch (error) {
      console.error('Error checking answers:', error);
      setMessage('Error checking answers. Please try again.');
    }
  };

  // 每次切换音频或速度时，设置播放速率
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = audioSpeed;
    }
  }, [audioSpeed, title]);

  const handleCambridgeChange = (cambridge) => {
    setSelectedCambridge(cambridge);
    setTestGroups(testsByCambridge[cambridge] || []);
    setSelectedTest((testsByCambridge[cambridge] || [])[0] || 'all');
  };

  const handleTestGroupChange = (test) => {
    setSelectedTest(test);
  };

  // 在每次切换 title 时重置 autoPlayCount
  useEffect(() => {
    setAutoPlayCount(0);
  }, [title]);

  // 监听 audio 播放结束事件，实现自动播放计数和逻辑
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => {
      if (isLoop) {
        setAutoPlayCount(prev => {
          const next = prev + 1;
          // 6次后自动切换到0.8倍速
          if (next === 6) {
            setAudioSpeed(0.8);
          }
          // 12次后自动显示句子
          if (next === 12) {
            setShowSentence(true);
          }
          return next;
        });
        setTimeout(() => {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }, 200);
      }
    };
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isLoop, audioSpeed, title]);

  // 过滤当前显示的 titles
  const filteredTitles = allTitles.filter(t =>
    (selectedCambridge === 'all' || t.cambridge === selectedCambridge) &&
    (selectedTest === 'all' || t.test === selectedTest)
  );

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              Fill in the Nouns
            </Typography>
            {message && (
              <Alert severity={message.includes('Correct') ? 'success' : message.includes('blanks') ? 'error' : 'info'} sx={{ mb: 2 }}>
                {message}
              </Alert>
            )}
            {/* Display the complete sentence */}
            <Box sx={{ my: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                Listen to the sentence and identify the nouns:
              </Typography>
              {showSentence && (
                <Typography variant="body1" sx={{ fontSize: '1.2rem', lineHeight: 1.6 }}>
                  {sentence}
                </Typography>
              )}
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <audio
                  ref={audioRef}
                  controls
                  src={`http://localhost:5050/audio/${title}.mp3`}
                >
                  Your browser does not support the audio element.
                </audio>
                <Button
                  variant={isLoop ? 'contained' : 'outlined'}
                  color={isLoop ? 'success' : 'primary'}
                  size="small"
                  onClick={() => setIsLoop(l => !l)}
                  sx={{ minWidth: 0, p: 1 }}
                  title={isLoop ? 'Loop is ON' : 'Loop'}
                >
                  <LoopIcon />
                </Button>
                <ButtonGroup variant="outlined" size="small" sx={{ ml: 2 }}>
                  {[0.8, 1.0, 1.2].map((speed) => (
                    <Button
                      key={speed}
                      variant={audioSpeed === speed ? 'contained' : 'outlined'}
                      onClick={() => setAudioSpeed(speed)}
                    >
                      {speed}x
                    </Button>
                  ))}
                </ButtonGroup>
                <Typography variant="body2" sx={{ ml: 2, minWidth: 60 }}>
                  Plays: {autoPlayCount}
                </Typography>
              </Box>
            </Box>
            {/* Display input fields for nouns */}
            <Box sx={{ my: 3 }}>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                Fill in the nouns you heard ({nounCount} nouns):
              </Typography>
              <Grid container spacing={2}>
                {Array.from({ length: nounCount }).map((_, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <TextField
                      fullWidth
                      label={`Noun ${index + 1}`}
                      value={answers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      variant="outlined"
                      size="small"
                      disabled={showCorrect}
                      sx={
                        inputStatus.length > 0 ? {
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: inputStatus[index] === undefined ? undefined : (inputStatus[index] ? 'green' : 'red'),
                              borderWidth: inputStatus[index] === undefined ? undefined : 2,
                            }
                          }
                        } : emptyWarning && !answers[index].trim() ? {
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: 'red',
                              borderWidth: 2,
                            }
                          }
                        } : {}
                      }
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      inputRef={el => inputRefs.current[index] = el}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            {showCorrect && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle1" color="primary">
                  Correct nouns: {correctNouns.join(', ')}
                </Typography>
              </Box>
            )}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={showCorrect}
              >
                Submit
              </Button>
              <Button
                variant="outlined"
                onClick={fetchNewSentence}
              >
                Next Sentence
              </Button>
            </Box>
          </Paper>
        </Box>
        {/* Right panel */}
        <Box sx={{ width: 260, minWidth: 200, bgcolor: '#f9f9f9', borderRadius: 2, p: 2, height: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Progress
          </Typography>
          {/* 第一层 Cambridge 分组 */}
          <Box sx={{ mb: 2 }}>
            <ButtonGroup variant="outlined" aria-label="cambridge group selector">
              {cambridgeGroups.map(cam => (
                <Button
                  key={cam}
                  variant={selectedCambridge === cam ? "contained" : "outlined"}
                  onClick={() => handleCambridgeChange(cam)}
                >
                  {cam}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
          {/* 第二层 test 分组 */}
          <Box sx={{ mb: 2 }}>
            <ButtonGroup variant="outlined" aria-label="test group selector">
              {(testsByCambridge[selectedCambridge] || []).map(test => (
                <Button
                  key={test}
                  variant={selectedTest === test ? "contained" : "outlined"}
                  onClick={() => handleTestGroupChange(test)}
                >
                  {test}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredTitles.map((t) => (
              <Button
                key={t.title}
                variant={t.title === title ? 'contained' : 'outlined'}
                color={completedTitles[t.title] >= 2 ? 'success' : 'primary'}
                size="small"
                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: t.title === title ? 'bold' : 'normal', opacity: completedTitles[t.title] >= 2 ? 1 : 0.6 }}
                onClick={() => jumpToTitle(t.title)}
              >
                {t.title}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
