var NicknameStorage = {
  getNickname () {
    return localStorage.getItem('nickname');
  },

  setNickname (nickname) {
    localStorage.setItem('nickname', nickname);
  },
};
