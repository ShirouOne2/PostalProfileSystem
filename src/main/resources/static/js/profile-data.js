/**
 * profile-data.js
 * Injects office data from Thymeleaf into window.OFFICE_DATA
 * This file should be loaded before profile.js
 */

window.OFFICE_DATA = {
    id:                         /*[[${office.id}]]*/ null,
    name:                       /*[[${postOffice.postalOffice}]]*/ '',
    postmaster:                 /*[[${postOffice.postmaster}]]*/ '',
    address:                    /*[[${postOffice.addressLine}]]*/ '',
    zipCode:                    /*[[${postOffice.zipCode}]]*/ '',
    connectionStatus:           /*[[${postOffice.status == 'Active'}]]*/ false,
    internetServiceProvider:    /*[[${postOffice.internetServiceProvider}]]*/ '',
    typeOfConnection:           /*[[${postOffice.typeOfConnection}]]*/ '',
    speed:                      /*[[${postOffice.speed}]]*/ '',
    staticIpAddress:            /*[[${postOffice.staticIpAddress}]]*/ '',
    noOfEmployees:              /*[[${postOffice.noOfEmployees}]]*/ 0,
    noOfPostalTellers:          /*[[${postOffice.noOfPostalTellers}]]*/ 0,
    noOfLetterCarriers:         /*[[${postOffice.noOfLetterCarriers}]]*/ 0,
    postalOfficeContactPerson:  /*[[${postOffice.postalOfficeContactPerson}]]*/ '',
    postalOfficeContactNumber:  /*[[${postOffice.postalOfficeContactNumber}]]*/ '',
    ispContactPerson:           /*[[${postOffice.ispContactPerson}]]*/ '',
    ispContactNumber:           /*[[${postOffice.ispContactNumber}]]*/ '',
    latitude:                   /*[[${postOffice.latitude}]]*/ null,
    longitude:                  /*[[${postOffice.longitude}]]*/ null
};
