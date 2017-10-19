// Set the original zoom level of the example image viewed
var zoom_level = 17;

// zoomUpdate() will alter our image zoom value from the min 17
function zoomUpdate(value) {
  zoom_level = parseInt(document.querySelector("#zoom").value);

  if(document.querySelector("#zoom").value >= 20) {
    document.querySelector("#msg").innerHTML = "A higher zoom level means long loading times.";
    document.querySelector("#msg").style = "color:red";
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
funtion notifyError(err, msg) {
  document.querySelector("#msg").innerHTML = msg + "Console check for errors.";
  document.querySelector("#msg").style = "color:red";
  throw new Error(err);
};

// generateListener() will allow for
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
