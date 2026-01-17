
function escapeRegex(text){
  return text.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")
}

const paginateHelper=async(model,options={})=>{
try {
  let {
  page=1,
  limit=10,
  sort={createdAt:-1},
  filters={},
  search="",
  searchFields=['name'],
  populate=null
}=options
const pageNum=Math.max(1,parseInt(page))
const limitNum=Math.max(1,parseInt(limit))
const skip=(pageNum-1)*limitNum

let queryCondition={...filters}
if(search && searchFields.length>0){
  const searchRegex={$regex:escapeRegex(search),$options:"i"}
  const searchOr=searchFields.map((field)=>({
    [field]:searchRegex,
  }))
  queryCondition={
    $and:[
      filters,
      {$or:searchOr}
    ]
  }
}
let dataQuery=model.find(queryCondition).sort(sort).skip(skip).limit(limitNum)
if(populate){
  dataQuery=dataQuery.populate(populate)
}

const [totalDocuments,results]=await Promise.all([
  model.countDocuments(queryCondition),dataQuery.exec()
])
const totalPages=Math.ceil(totalDocuments/limitNum)

return{
  results,
  pagination:{
    totalDocuments,
    limit:limitNum,
    totalPages,
    currentPage:pageNum,
    hasNextPage:pageNum<totalPages,
    hasPrevPage:pageNum>1
  }
}
} catch (error) {
  throw new Error("Pagination Helper Error: "+error.message)
}
}
export { paginateHelper };
