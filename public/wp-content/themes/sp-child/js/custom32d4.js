// Проверка на IE

function isInternetExplorer() {
return window.navigator.userAgent.indexOf('MSIE ') > -1 || window.navigator.userAgent.indexOf('Trident/') > -1;
}
console.log(isInternetExplorer());
if (isInternetExplorer() === false) {
    console.log('Браузер не IE');

} else {
	jQuery(function($){
		$( '#eto-ie' ).append( "<div></div>" );
		$( '#eto-ie' ).css( 'display', 'flex' );
		$( '#eto-ie' ).slideDown('slow', function() {
		$( '#eto-ie div').html('Мы обнаружили, что Вы используете устаревший и не безопасный браузер <strong>Internet Exploer</strong>!<br />В целях корректного отображения сайта и Вашей безопасности, пожалуйста, обновите программу!');
	}).delay(6000);

	});

}




// function stickyMainmenu() {
//    if ($('.strickys').length) {
//        var strickyScrollPos = 100;
//        if ($(window).scrollTop() > strickyScrollPos) {
//            $('.strickys').addClass('stricky-fixed');
//            $('.scroll-to-top').fadeIn(500);
// 			$('.logo').addClass('stricky-fixed2');
//        } else if ($(this).scrollTop() <= strickyScrollPos) {
//            $('.strickys').removeClass('stricky-fixed');
//            $('.scroll-to-top').fadeOut(500);
// 			$('.logo').removeClass('stricky-fixed2');
//        }
//    }
// }




//jQuery(function($){
//	$("#rost .last label").click(function(){
//			$(".pometka").slideToggle("slow");
//			return false;
//		});
//});

// Popup content
jQuery(document).ready(function () {
	jQuery('.mdl').magnificPopup({
		type: 'inline',
		fixedContentPos: true,
		closeOnBgClick: true,
		closeBtnInside: false,
		preloader: false,
		focus: '#username'
	});
	jQuery(document).on('click', '.mfp-close2', function (e) {
		e.preventDefault();
		jQuery.magnificPopup.close();
	});
});

// Popup content  mdlcall
jQuery(document).ready(function () {
	jQuery('.mdlcall a').magnificPopup({
		type: 'inline',
		fixedContentPos: true,
		closeOnBgClick: true,
		closeBtnInside: false,
		preloader: false,
		focus: '#username'
	});
	jQuery(document).on('click', '.mfp-close2', function (e) {
		e.preventDefault();
		jQuery.magnificPopup.close();
	});
});

// Popup content  снаряжение
jQuery(document).ready(function () {
	jQuery('.ajax-popup-link').magnificPopup({
		type: 'ajax',
		fixedContentPos: true,
		closeOnBgClick: true,
		closeBtnInside: true,
	});
	jQuery(document).on('click', '.mfp-close2', function (e) {
		e.preventDefault();
		jQuery.magnificPopup.close();
	});
});


// Popup content  Галерея фото
jQuery(document).ready(function () {
	jQuery('.kc-carousel-image').each(function() {

	  var $container = jQuery(this);
	  var $imageLinks = $container.find('.item');

	  var items = [];
	  $imageLinks.each(function() {
		var $item = jQuery(this);
		var type = 'image';
		if ($item.hasClass('magnific-youtube')) {
		  type = 'iframe';
		}
		var magItem = {
		  src: $item.attr('href'),
		  type: type
		};
		magItem.title = $item.data('title');
		items.push(magItem);
		});

	  $imageLinks.magnificPopup({
		mainClass: 'mfp-fade',
		items: items,
		gallery:{
			enabled:true,
			tPrev: jQuery(this).data('prev-text'),
			tNext: jQuery(this).data('next-text')
		},
		type: 'image',
		callbacks: {
		  beforeOpen: function() {
			var index = $imageLinks.index(this.st.el);
			if (-1 !== index) {
			  this.goTo(index);
			}
		  }
		}
	  });
	});

});




jQuery(document).ready(function(){
   if (screen.width >= 590){
         // forma
		jQuery(document).ready(function () {
			jQuery('.d3d a').magnificPopup({
				type: 'iframe',
				mainClass: '3dd',


			});
		});
		jQuery(document).ready(function(){

			jQuery('li.3d3d').magnificPopup({
				type: 'iframe',
				mainClass: '3dd',

				callbacks: {
					elementParse: function(item) { item.src = item.el.attr('data-link'); }
				}

			});

         });
   }
});



// Смена телефонов через ymaps удалена (Яндекс.Карты не используются в статичной копии)

// Формы
jQuery(function($) {
	$(document).ready(function(){
	 $("#rost .last label input").change(function(){

	  if ($(this).attr("checked")) {
		  $('.pometka').fadeIn().show();
		  return;
	  } else {
		  $('.pometka').fadeOut(300);
	  }

	 });
	})

	$(document).ready(function(){
	 $("#rost .first label input").change(function(){

	  if ($(this).attr("checked")) {
		  $('.pometka').fadeOut().hide();
		  return;
	  } else {
		  $('.pometka').fadeOut(300);
	  }

	 });
	})

	$(document).ready(function(){
	 $("#rost .wpcf7-list-item:nth-child(2) label input").change(function(){

	  if ($(this).attr("checked")) {
		  $('.pometka').fadeOut().hide();
		  return;
	  } else {
		  $('.pometka').fadeOut(300);
	  }

	 });
	})

	$(document).ready( function() {
		$(".file-171 input[type=file]").change(function(){
			 var filename = $(this).val().replace(/.*\\/, "");
			 $("#filenamef").val(filename);
		});
	});

	$(document).ready( function() {
		$(".file-172 input[type=file]").change(function(){
			 var filename = $(this).val().replace(/.*\\/, "");
			 $("#filenamer").val(filename);
		});
	});
});
