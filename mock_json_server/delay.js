/**
 * Artificial latency, to make the loading and synchronisation behaviour of the
 * micro-frontends visible while developing.
 *
 * Deliberately narrow: only `GET /items` without a query string is slowed down.
 * Writes stay fast (so the write -> re-read -> broadcast chain is quick) and
 * mfe_2's filter (`?q=`) stays responsive.
 *
 * Side effect worth knowing (COMPREHENSIVE_GUIDE.md § 10.7): at startup three
 * MFEs fetch /items at once, so the 2s are paid three times in parallel - which
 * is exactly the window the "broadcast wins over a slow initial fetch" guards
 * in useItems/useItemsFilter/useNotifications exist for.
 */
module.exports = (req, res, next) => {
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