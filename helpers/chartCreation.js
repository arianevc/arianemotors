const processChartData=function (data,filter,startDate,endDate){
    const labels=[]
    const revenueData=[]
    const dataMap=new Map(data.map(item=>[item._id,item.totalSales]))

    let currentDate=new Date(startDate)

    while(currentDate<=endDate){
    if(filter==='yearly'){
        //Format key='2025-01'
        const year=currentDate.getFullYear()
        const month=String(currentDate.getMonth()+1).padStart(2,'0')
        const key=`${year}-${month}`
        //format label:"Jan 2025" (Includes year so we distinguish Jan '25 from Jan '26)
            const label=currentDate.toLocaleString('default',{month:'short',year:'2-digit'})
            labels.push(label)
            revenueData.push(dataMap.get(key)||0)

    }else{
        //weekly/monthly
            const key=currentDate.toISOString().split('T')[0]//YYYY-MM-DD eg:2026-01-20
            //format label:20 or 'Mon'
            const label=currentDate.getDate()+' '+currentDate.toLocaleString('default',{weekday:'short'})
            labels.push(label)
            revenueData.push(dataMap.get(key)||0)
            currentDate.setDate(currentDate.getDate()+1)
        }
    }
    return{labels,revenueData}
}
export{processChartData}