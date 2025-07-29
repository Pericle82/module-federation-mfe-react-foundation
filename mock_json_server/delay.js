module.exports = (req, res, next) => {
  // Apply delay only to specific GET operations that should simulate slow loading
  const shouldDelay = (
    req.method === 'GET' && 
    req.path === '/items' && 
    !req.query.q // Don't delay filter operations (MFE_2)
  );
  
  if (shouldDelay) {
    console.log('DELAY middleware - applying 2s delay for main fetch items');
    setTimeout(next, 2000);
  } else {
    console.log(`DELAY middleware - no delay for ${req.method} ${req.path} ${req.query.q ? '(filter)' : ''}`);
    next(); // No delay for DELETE, POST, filter operations, etc.
  }
};