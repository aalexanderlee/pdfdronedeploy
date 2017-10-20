// Set the original zoom level of the example image viewed
var zoom_level = 17;

// updateZoom() will alter our image zoom value from the min 17
function updateZoom(value) {
  zoom_level = parseInt(document.querySelector("#zoom").value);

  if(document.querySelector("#zoom").value >= 20) {
    document.querySelector("#msg").innerHTML = "A higher zoom level means long loading times.";
    document.querySelector("#msg").style = "color:red;";
  }
  else if (document.querySelector("#zoom").value < 20) {
    document.querySelector("#msg").innerHTML = "";
    document.querySelector("#msg").style = "";
  }
};

// ddApiMounted() will confirm API is ready for the button click event listener for PDF
function ddApiMounted() {
  return new Promise((resolve) => {
    window.dronedeploy.onload(() => {
      document.querySelector("#generate-button").addEventListener("click", generateListener);
    });
  });
};

// notifyError() will let us know if there was any error for zoomUpdate()
function notifyError(e, msg) {
  document.querySelector("#msg").innerHTML = msg + "Console check for errors.";
  document.querySelector("#msg").style = "color:red;";
  throw new Error(e);
};

// generateListener() gets plans
function generateListener() {
  document.querySelector("#msg").innerHTML = "Generating...";
  document.querySelector("#msg").style = "";

  getCurrentlyViewedPlan()                                       .catch(e => reportError(e,"Error getting Plan."))
    .then(plan         => getTileDataFromPlan(plan)              .catch(e => reportError(e,"Error getting Tiles."))
    .then(tileResponse => getAnnotations(plan)                   .catch(e => reportError(e,"Error getting Annotations."))
    .then(annotations  => sendTilesToServer(plan.geometry,tileResponse,annotations) .catch(e => reportError(e,"Error contacting server."))
    .then(response     => getResponseBlob(response)              .catch(e => reportError(e,"Error reading response from server."))
    .then(responseBlob => readResponseBlob(responseBlob)         .catch(e => reportError(e,"Error reading response from server."))
    .then(reader       => generatePDF(plan, reader, annotations)
  ))))))
};

// Returns the current plans from Drone Deploy
function getCurrentlyViewedPlan() {
  return window.dronedeploy.Plans.getCurrentlyViewed();
};

// Returns tile data of parameters planId, layerName, zoom_level
function getTileDataFromPlan(plan) {
  return window.dronedeploy.Tiles.get({planId: plan.id, layerName: "ortho", zoom_level});
};

// Returns the annocations for plan.id in API JSON
function getAnnotations(plan){
  return window.dronedeploy.Annotations.get(plan.id);
}

// Returns the res.tile data
function sendTilesToServer(planGeo,tileResponse, annotations){
  var body = {
    tiles: tileResponse.tiles,
    planGeo: planGeo,
    zoom_level: zoom_level,
    annotations: annotations
  };
  JSON.stringify(body);
  return fetch("https://www.dronedeploy.com/app2/dashboard/", {
    method: "POST",
    body: JSON.stringify(body)
  });
};


function getResponseBlob(response){
  return response.blob();
}

function readResponseBlob(responseBlob){

  return new Promise((resolve) => {

    var reader = new FileReader();
    reader.onloadend = () => resolve(reader);
    reader.readAsBinaryString(responseBlob);

  });
}

function generatePDF(plan, reader, annotations){

  responseJSON = JSON.parse(reader.result);

  //Convert mm to pt, using doc.autoTable requires jsPDF in pt form,
  mm2pt = 2.8346;
  width = responseJSON.new_width*mm2pt/10
  left_margin = (180*mm2pt - width)/2 + 15*mm2pt

  // Render columns & rows for annotation table
  var columns = ["Plan ID", "Distance", "Area", "Volume"];
  var rows = [];
  for (a in annotations){
    annotation = annotations[a];

    var chr = String.fromCharCode(65 + parseInt(a));

    if (annotation.annotationType == "LINE")
      var row = [chr, annotation.info.geometry[0].value + " m" , "-", "-"];

    else if (annotation.annotationType == "AREA")
      var row = [chr, "-", annotation.info.geometry[0].value + " m^2", "-"];

    else if (annotation.annotationType == "VOLUME")
      var row = [chr, "-", "-", annotation.info.geometry[0].value + " m^3"];

    else
      var row = [chr, "-", "-", "-"];

    rows.push(row);
  }

  var doc = new jsPDF("p","pt");
  doc.text(plan.name, left_margin, 30);
  doc.addImage(responseJSON.image, "JPEG", left_margin, 40, width, responseJSON.new_height*mm2pt/10);
  doc.autoTable(columns, rows, {startY:responseJSON.new_height*mm2pt/10+40+10, tableWidth:180*mm2pt, margin:{left:15*mm2pt}});
  doc.save(plan.name + ".pdf");

  document.querySelector("#msg").innerHTML = "Finished";
  document.querySelector("#msg").style = "";

}

// event listener
ddApiMounted();
