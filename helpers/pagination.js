async function paginateHelper(model,req,limit,filter) {
const page=parseInt(req.query.page)||1
const skip=(page-1)*limit

const totalItems=await model.countDocuments(filter)
const totalPages=Math.ceil(totalItems/limit)
return {totalPages,limit,skip,page}
}
export { paginateHelper };
