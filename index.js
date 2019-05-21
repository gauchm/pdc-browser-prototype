
var map = L.map('mapid').setView([53, -95], 3.5);
var currentMetadata = null;
var markers = [];

const GLOBAL_MARKER_TYPE = "G";
const LOCAL_MARKER_TYPE = "L";

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    continuousWorld: true
}).addTo(map);

var boundsOffControl = L.control({ position: 'topleft' });
var boundsOnControl = L.control({ position: 'topleft' });
var controlContainer = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
controlContainer.style.backgroundColor = 'white';
controlContainer.style.backgroundSize = "27px 27px";
controlContainer.style.backgroundPosition = '50%';
controlContainer.style.width = '34px';
controlContainer.style.height = '34px';
boundsOffControl.onAdd = function (map) {
    controlContainer.style.backgroundImage = "url(images/black_location_off.svg)";

    controlContainer.onclick = function(){
      allBoundsOff();
      map.removeControl(boundsOffControl);
      map.addControl(boundsOnControl);
    }
    return controlContainer;
}
boundsOnControl.onAdd = function (map) {
    controlContainer.style.backgroundImage = "url(images/black_location_on.svg)";
    controlContainer.onclick = function(){
      allBoundsOn();
      map.removeControl(boundsOnControl);
      map.addControl(boundsOffControl);
    }
    return controlContainer;
}
boundsOffControl.addTo(map);

// Sidebar resizing
var minSize = 100;
var maxSize = $(window).width() * 0.95;
$('#splitbar').mousedown(function (e) {
    e.preventDefault();
    $(document).mousemove(function (e) {
        e.preventDefault();
        var x = e.pageX - $('#sidebar-wrapper').offset().left;
        if (x > minSize && x < maxSize && e.pageX < ($(window).width() - minSize)) {  
          $('#sidebar-wrapper').css("width", x);
          $('#map-container').css("width", $(window).width() - x);
          map.invalidateSize();
        }
    })
});
$(document).mouseup(function (e) {
    $(document).unbind('mousemove');
});

// Watch for URL anchors to allow direct access through URL
function hashChanged() { 
    let target = window.location.hash.substr(1);
    if (target !== "") {
        for (let i = 0; i < datasets.length; i++) {
            if (datasets[i]["gmd:MD_Metadata"]["gmd:fileIdentifier"] === target && currentMetadata != i) {
                toggleMetadata(i, true);
            }
        }
    }
}
window.addEventListener("hashchange", hashChanged, false);
$(document).ready(hashChanged);

const MAX_BOUNDING_BOX_AREA = 64800; // This is the area of the entire map.
var bounding_box_area_and_marker_index_pairs = [];

for (let i = 0; i < datasets.length; i++) { 
    
    var dataset = datasets[i];
    var title = getTitle(dataset);
    var datasetId = dataset["gmd:MD_Metadata"]["gmd:fileIdentifier"]["gco:CharacterString"];
    
    var marker = null;
    var markerType = null;
    var markerSelectedIcon = null;
    var markerDeselectedIcon = null;
    var markerIconClickable = null;

    var bounding_box = getBoundingBox(dataset);

    if (bounding_box.length == 2) {

        marker = L.marker(bounding_box);

        markerType = LOCAL_MARKER_TYPE;

        bounding_box_area_and_marker_index_pairs.push([0, i]);

    } 
    else {

        let bounding_box_length = null;
        let bounding_box_height = null;

        let p0 = bounding_box[0];
        for (let j = 1; j < bounding_box.length; j ++) {
            let pj = bounding_box[j];
            if (pj[0] == p0[0]) {
                bounding_box_height = Math.abs(pj[1] - p0[1]);
            }
            else if (pj[1] == p0[1]) {
                bounding_box_length = Math.abs(pj[0] - p0[0]);
            }
        }

        let bounding_box_area = bounding_box_length * bounding_box_height;
        if (bounding_box_area / MAX_BOUNDING_BOX_AREA < 1) {

            marker = L.polygon(bounding_box);

            markerType = LOCAL_MARKER_TYPE;

        }
        else {

            marker = L.polygon(bounding_box);

            markerType = GLOBAL_MARKER_TYPE;

        }

        bounding_box_area_and_marker_index_pairs.push([bounding_box_area, i]);

    }

    marker.on('click', function(e) {
        toggleMetadata(i, true);
        window.location.hash = "#" + datasets[i]["gmd:MD_Metadata"]["gmd:fileIdentifier"];
    });
    
    markers.push([marker, markerType]);

    if (markerType == LOCAL_MARKER_TYPE) {
        markerSelectedIcon = "location_on";
        markerDeselectedIcon = "location_off";
        markerIconClickable = true;
    }
    else if (markerType == GLOBAL_MARKER_TYPE) {
        markerSelectedIcon = "language";
        markerDeselectedIcon = markerSelectedIcon;
        markerIconClickable = false;
    }

    var card =  `<div id="${datasetId}">` +
                    `<div class="card" id="dataset-${i}">` +
                        `<div class="row card-header m-0 p-0" id="heading-${i}" >` +
                            `<a href="#${datasetId}" class="h6 col m-0 p-3 collapsed text-left stretched-link" data-target="#collapse-${i}" aria-expanded="false" aria-controls="collapse-${i}" onclick="toggleMetadata(${i}, false);" style="text-decoration: none">` +
                                `${title}` + 
                            '</a>' +
                            '<div class="m-2">' +
                                `<button id="showBounds-${i}" class="btn btn-link" onclick="toggleBounds(${i});" style="display: none; z-index: 2000;">` +
                                    `<i class="material-icons"> ${markerSelectedIcon} </i>` +
                                `</button>` +
                                `<button id="hideBounds-${i}" class="btn btn-link" onclick="toggleBounds(${i});" style="z-index: 2000;">` +
                                    `<i class="material-icons"> ${markerDeselectedIcon} </i>` +
                                `</button>` +
                            '</div>' +
                        '</div>' +
                        `<div id="collapse-${i}" class="collapse" aria-labelledby="heading-${i}" data-parent="#datasetList">` +
                          '<div class="card-body">' +
                            `<div id="metadataTable-${i}"></div>` +
                          '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
    $(card).appendTo('#datasetList');

    if (markerType == GLOBAL_MARKER_TYPE) {
        $(`#hideBounds-${i}`).attr("title", "Global Dataset");
        $(`#showBounds-${i}`).attr("title", 'Global Dataset');
    }
    else if (markerType == LOCAL_MARKER_TYPE) {
        $(`#hideBounds-${i}`).attr("title", "Hide Region");
        $(`#showBounds-${i}`).attr("title", 'Show Region');
    }

    if (!markerIconClickable) {
        $(`#hideBounds-${i}`).attr("disabled", true);
        $(`#showBounds-${i}`).attr("disabled", true);   
    } 

    $('#datasetList #metadataTable-' + i).load('datasetMetadata.html', function() { populateMetadataTable(i); });
}

bounding_box_area_and_marker_index_pairs.sort(function(a, b) {

    if (a[0] < b[0]) {
        return +1;
    }
    else if (a[0] > b[0]) {
        return -1;
    }
    else {
        return 0;
    }

});

allBoundsOn();


function allBoundsOff() {

    for (let i = 0; i < markers.length; i++) { 

        if (markers[i][1] == LOCAL_MARKER_TYPE &&
            map.hasLayer(markers[i][0])) {

            map.removeLayer(markers[i][0]);
            $('#showBounds-' + i).show();
            $('#hideBounds-' + i).hide();

        }

    }
}

function allBoundsOn() {

    for (let j = 0; j < bounding_box_area_and_marker_index_pairs.length; j++) { 

        let bounding_box_area_and_marker_index = bounding_box_area_and_marker_index_pairs[j];
        let i = bounding_box_area_and_marker_index[1];

        if (markers[i][1] == LOCAL_MARKER_TYPE &&
            !map.hasLayer(markers[i][0])) {

            map.addLayer(markers[i][0]);
            $('#showBounds-' + i).hide();
            $('#hideBounds-' + i).show();

        }

    }

}

function toggleBounds(i) {

    if (markers[i][1] == LOCAL_MARKER_TYPE) {

        if (map.hasLayer(markers[i][0])) {

            map.removeLayer(markers[i][0]);
            $('#showBounds-' + i).show();
            $('#hideBounds-' + i).hide();
    
        } 
        else {
    
            for (let j = 0; j < bounding_box_area_and_marker_index_pairs.length; j ++) {

                let bounding_box_area_and_marker_index = bounding_box_area_and_marker_index_pairs[j];
                let k = bounding_box_area_and_marker_index[1];

                if (k == i || map.hasLayer(markers[k][0])) {

                    map.removeLayer(markers[k][0]);
                    map.addLayer(markers[k][0]);
                    $('#showBounds-' + k).hide();
                    $('#hideBounds-' + k).show();

                }

            }

        }

    }
    
}


function toggleMetadata(selectedMetadata, scroll_to) {

    if (selectedMetadata == currentMetadata) {
        closeMetadata();
        return;
    }
    closeMetadata();
    currentMetadata = selectedMetadata;
    var dataset = datasets[selectedMetadata];
    
    // Open selected accordion card
    $('#collapse-' + selectedMetadata).removeClass('collapse');

    // Scroll to card in dataset list
    if (scroll_to) {
        var target = $('#dataset-' + selectedMetadata);
        $('#datasetList').scrollTop = 0;
        target[0].scrollIntoView(true);
        $('#datasetList')[0].scrollTop -= 8;
    }
    
    // Highlight entry in dataset list
    $('#dataset-' + selectedMetadata).addClass('border-primary');
    
    // Remove other markers
    for (let i = 0; i < markers.length; i++) {

        if (i != selectedMetadata &&
            markers[i][1] == LOCAL_MARKER_TYPE &&
            map.hasLayer(markers[i][0])) {

            map.removeLayer(markers[i][0]);
            $('#showBounds-' + i).show();
            $('#hideBounds-' + i).hide();

        }

    }
    
    if (markers[selectedMetadata][0].getCenter) {
        map.flyToBounds(markers[selectedMetadata][0].getBounds().pad(Math.sqrt(2) / 2), {animate: true, duration: 0.5});  // Polygon
    } else {
        map.panTo(markers[selectedMetadata][0].getLatLng());  // Marker
    }
    
}

function closeMetadata() {

    if (currentMetadata != null) {

        // Collapse card in dataset list and remove highlighting
        $('#collapse-' + currentMetadata).addClass('collapse');
        $('#dataset-' + currentMetadata).removeClass('border-primary');
        
        // Add back markers
        for (let j = 0; j < bounding_box_area_and_marker_index_pairs.length; j++) {

            let bounding_box_area_and_marker_index = bounding_box_area_and_marker_index_pairs[j];
            let i = bounding_box_area_and_marker_index[1];

            if (markers[i][1] == LOCAL_MARKER_TYPE) {

                map.removeLayer(markers[i][0]);
                map.addLayer(markers[i][0]);                
                $('#showBounds-' + i).hide();
                $('#hideBounds-' + i).show();

            }

        }

        currentMetadata = null;

    }

}

function getTitle(dataset) {
    return dataset["gmd:MD_Metadata"]["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:citation"]["gmd:CI_Citation"]["gmd:title"]["gco:CharacterString"];
}

function getBoundingBox(dataset) {
    var bb_json = dataset["gmd:MD_Metadata"]["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"];
    var west_lon = bb_json["gmd:westBoundLongitude"]["gco:Decimal"];
    var east_lon = bb_json["gmd:eastBoundLongitude"]["gco:Decimal"];
    var south_lat = bb_json["gmd:southBoundLatitude"]["gco:Decimal"];
    var north_lat = bb_json["gmd:northBoundLatitude"]["gco:Decimal"];
    
    if (west_lon == east_lon && south_lat == north_lat) {
        return [north_lat, west_lon];
    } else {
        return [[north_lat, west_lon], [south_lat, west_lon], [south_lat, east_lon], [north_lat, east_lon]];
    }
}

function formatRole(role) {
    if (role === 'principalInvestigator') {
        return 'Principal Investigator';
    } else if (role === 'pointOfContact') {
        return 'Point of Contact';
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatConstraint(constraint) {
    if (constraint === 'otherRestrictions') {
        return 'Other restrictions';
    }
}

function populateMetadataTable(i){
    let metadata = cleanMetadata(datasets[i])["gmd:MD_Metadata"];
    var file_id = metadata["gmd:fileIdentifier"];
    var language = metadata["gmd:language"];
    var charset = metadata["gmd:characterSet"]["gmd:MD_CharacterSetCode"];
    var hierarchyLevel = metadata["gmd:hierarchyLevel"]["gmd:MD_ScopeCode"];
    
    var contact_person = "UW GWF Data Manager"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:individualName"];
    var contact_org = "Global Water Futures, University of Waterloo"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:organisationName"];
    var address = "200 University Ave W"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:deliveryPoint"];
    var city = "Waterloo"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:city"];
    var province = "ON"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:administrativeArea"];
    var postalCode = "N2L 3G1"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:postalCode"];
    var country = "Canada"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:country"];
    var email = "gwf-uw@uwaterloo.ca"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:electronicMailAddress"];
    var phone = "5198884567 ext 31327"; //metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:phone"]["gmd:CI_Telephone"]["gmd:voice"];
    var website = "https://uwaterloo.ca/global-water-futures/"; //metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:pointOfContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:onlineResource"]["gmd:CI_OnlineResource"]["gmd:linkage"]["gmd:URL"];
    var role = "Point Of Contact"; //formatRole(metadata["gmd:contact"]["gmd:CI_ResponsibleParty"]["gmd:role"]["gmd:CI_RoleCode"]);
    var dateStamp = metadata["gmd:dateStamp"];
    var standardName = metadata["gmd:metadataStandardName"];
    var standardVersion = metadata["gmd:metadataStandardVersion"];
    var datasetURI = metadata["gmd:dataSetURI"];
    
    var title = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:citation"]["gmd:CI_Citation"]["gmd:title"];
    var responsibleParties = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:citation"]["gmd:CI_Citation"]["gmd:citedResponsibleParty"];//TODO
    var recommendedCitation = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:citation"]["gmd:CI_Citation"]["gmd:otherCitationDetails"];
    var purpose = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:purpose"];
    var abstr = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:abstract"];
    var supplInfo = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:supplementalInformation"];
    var topicCategory = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:topicCategory"]["gmd:MD_TopicCategoryCode"];
    var status = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:status"]["gmd:MD_ProgressCode"];
    
    var keywords = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:descriptiveKeywords"]; //TODO
    var thesaurusName = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:descriptiveKeywords"][0]["gmd:MD_Keywords"]["gmd:thesaurusName"]["gmd:CI_Citation"]["gmd:title"] + ": " + 
                        metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:descriptiveKeywords"][0]["gmd:MD_Keywords"]["gmd:thesaurusName"]["gmd:CI_Citation"]["gmd:otherCitationDetails"];
    
    var useConstraints = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:resourceConstraints"]["gmd:MD_LegalConstraints"]["gmd:useConstraints"]["gmd:MD_RestrictionCode"];
    var accessConstraints = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:resourceConstraints"]["gmd:MD_LegalConstraints"]["gmd:accessConstraints"]["gmd:MD_RestrictionCode"];
    
    var westLon = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"]["gmd:westBoundLongitude"];
    var eastLon = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"]["gmd:eastBoundLongitude"];
    var northLat = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"]["gmd:northBoundLatitude"];
    var southLat = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:geographicElement"]["gmd:EX_GeographicBoundingBox"]["gmd:southBoundLatitude"];
    
    var beginDate = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:temporalElement"]["gmd:EX_TemporalExtent"]["gmd:extent"]["gml:TimePeriod"]["gml:beginPosition"];
    var endDate = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:extent"]["gmd:EX_Extent"]["gmd:temporalElement"]["gmd:EX_TemporalExtent"]["gmd:extent"]["gml:TimePeriod"]["gml:endPosition"];
    
    var distr_contactOrg = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:pointOfContact"]["gmd:CI_ResponsibleParty"]["gmd:organisationName"];
    var distr_contactPerson = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:pointOfContact"]["gmd:CI_ResponsibleParty"]["gmd:individualName"];
    var distr_contactPosition = metadata["gmd:identificationInfo"]["gmd:MD_DataIdentification"]["gmd:pointOfContact"]["gmd:CI_ResponsibleParty"]; //TODO
    var distr_address =  metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:deliveryPoint"];;
    var distr_city =     metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:city"];
    var distr_province = metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:administrativeArea"];
    var distr_postalCode=metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:postalCode"];
    var distr_country =  metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:country"];
    var distr_email =    metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:address"]["gmd:CI_Address"]["gmd:electronicMailAddress"];
    var distr_phone =    metadata["gmd:distributionInfo"]["gmd:MD_Distribution"]["gmd:distributor"]["gmd:MD_Distributor"]["gmd:distributorContact"]["gmd:CI_ResponsibleParty"]["gmd:contactInfo"]["gmd:CI_Contact"]["gmd:phone"]["gmd:CI_Telephone"]["gmd:voice"];
    var maintenanceFreq = metadata["gmd:metadataMaintenance"]["gmd:MD_MaintenanceInformation"]["gmd:maintenanceAndUpdateFrequency"]; //TODO
    
    var metadataTable = '#metadataTable-' + i;
    $(metadataTable + ' #meta-file_id').text(file_id);
    $(metadataTable + ' #meta-language').html(language);
    $(metadataTable + ' #meta-charset').html(charset);
    $(metadataTable + ' #meta-hierarchyLevel').html(hierarchyLevel);
    $(metadataTable + ' #meta-contact_person').html(contact_person);
    $(metadataTable + ' #meta-contact_org').html(contact_org);
    $(metadataTable + ' #meta-address').html(address);
    $(metadataTable + ' #meta-city').html(city);
    $(metadataTable + ' #meta-province').html(province);
    $(metadataTable + ' #meta-postalCode').html(postalCode);
    $(metadataTable + ' #meta-country').html(country);
    $(metadataTable + ' #meta-email').html("<a href='mailto:" + email + "'>" + email + "</a>");
    $(metadataTable + ' #meta-phone').html(phone);
    $(metadataTable + ' #meta-website').html("<a href='" + website + "' target='_blank' rel='noopener noreferrer'>" + website + "</a>");
    $(metadataTable + ' #meta-role').html(role);
    $(metadataTable + ' #meta-dateStamp').html(dateStamp);
    $(metadataTable + ' #meta-standardName').html(standardName);
    $(metadataTable + ' #meta-standardVersion').html(standardVersion);
    $(metadataTable + ' #meta-datasetURI').html("<a href='" + datasetURI + "' target='_blank' rel='noopener noreferrer'>" + datasetURI + "</a>");
    
    var responsiblePartiesString = "";
    for (let i = 0; i < responsibleParties.length; i++) {
        responsiblePartiesString += responsibleParties[i]["gmd:CI_ResponsibleParty"]["gmd:individualName"] + " (" + 
                                    formatRole(responsibleParties[i]["gmd:CI_ResponsibleParty"]["gmd:role"]["gmd:CI_RoleCode"]) + ")<br/>";
    }
    $(metadataTable + ' #meta-responsibleParties').html(responsiblePartiesString.substring(0, responsiblePartiesString.length - 5));
    $(metadataTable + ' #meta-recommendedCitation').html(recommendedCitation);
    $(metadataTable + ' #meta-purpose').html(purpose);
    $(metadataTable + ' #meta-abstr').html(abstr);
    $(metadataTable + ' #meta-supplInfo').html(supplInfo);
    $(metadataTable + ' #meta-topicCategory').html(topicCategory);
    
    if (status === 'underDevelopment') {
        status = 'Under development';
    }
    $(metadataTable + ' #meta-status').html(status);
    
    var keywordsString = "";
    for (let i = 0; i < keywords.length; i++) {
        var keywordList = keywords[i]["gmd:MD_Keywords"]["gmd:keyword"];
        if (typeof keywordList != 'string') {
            for (let j = 0; j < keywordList.length; j++) {
                keywordsString += keywordList[j] + ", "
            }
        } else {
            keywordsString += keywordList + ", "
        }
        keywordsString += '<p></p>';
    }
    $(metadataTable + ' #meta-keywords').html(keywordsString.substring(0, keywordsString.length - 9));
    
    var urlExpr = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
    var urlRegex = new RegExp(urlExpr).exec(thesaurusName);
    if (urlRegex != null) {
      thesaurusName = thesaurusName.replace(urlRegex[0], `<a href="${urlRegex[0]}" target="_blank" rel="noopener noreferrer">${urlRegex[0]}</a>`);
    }
    $(metadataTable + ' #meta-thesaurusName').html(thesaurusName);
    
    $(metadataTable + ' #meta-useConstraints').html(formatConstraint(useConstraints));
    $(metadataTable + ' #meta-accessConstraints').html(formatConstraint(accessConstraints));
    
    $(metadataTable + ' #meta-westLon').html(westLon);
    $(metadataTable + ' #meta-eastLon').html(eastLon);
    $(metadataTable + ' #meta-northLat').html(northLat);
    $(metadataTable + ' #meta-southLat').html(southLat);
    
    $(metadataTable + ' #meta-beginDate').html(beginDate);
    $(metadataTable + ' #meta-endDate').html(endDate);
    
    $(metadataTable + ' #meta-distr_contactOrg').html(distr_contactOrg);
    $(metadataTable + ' #meta-distr_contactPerson').html(distr_contactPerson);
    $(metadataTable + ' #meta-distr_contactPosition').html(distr_contactPosition);
    $(metadataTable + ' #meta-distr_address').html(distr_address);
    $(metadataTable + ' #meta-distr_city').html(distr_city);
    $(metadataTable + ' #meta-distr_province').html(distr_province);
    $(metadataTable + ' #meta-distr_postalCode').html(distr_postalCode);
    $(metadataTable + ' #meta-distr_country').html(distr_country);
    $(metadataTable + ' #meta-distr_email').html("<a href='mailto:" + distr_email + "'>" + distr_email + "</a>");
    $(metadataTable + ' #meta-distr_phone').html(distr_phone);
    $(metadataTable + ' #meta-maintenanceFreq').html(maintenanceFreq);
}

function cleanMetadata(metadata) {
    if(typeof metadata == "object" && metadata !== null) {
        Object.keys(metadata).forEach(function(prop) {
            if (prop.startsWith('-')) {
                delete metadata[prop];
            } else if(metadata[prop]) {
                metadata[prop] = cleanMetadata(metadata[prop]);
                if(typeof metadata[prop] == "object" && metadata[prop] !== null) {
                    Object.keys(metadata[prop]).forEach(function(subprop) {
                        if (subprop.startsWith('gco') || subprop == '#text') {
                            metadata[prop] = metadata[prop][subprop]
                        }
                    });
                }
            }
        });
    }
    
    return metadata;
}
