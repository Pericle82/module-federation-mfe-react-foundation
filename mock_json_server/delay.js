module.exports = (req, res, next) => {
  console.log('DELAY middleware triggered');
  setTimeout(next, 2000);
};