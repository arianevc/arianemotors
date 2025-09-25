module.exports = function (req, res, next) {
    if (req.session.userId) {
        return res.redirect('/')
    } else if (req.session.adminId) {
        return res.redirect('/admin')
    }
    // If neither session exists, proceed to the login page
    next();
};